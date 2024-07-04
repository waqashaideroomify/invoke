# Copyright (c) 2024 Lincoln D. Stein and the InvokeAI Development team
# TODO: Add Stalker's proper name to copyright
"""
Manage a RAM cache of diffusion/transformer models for fast switching.
They are moved between GPU VRAM and CPU RAM as necessary. If the cache
grows larger than a preset maximum, then the least recently used
model will be cleared and (re)loaded from disk when next needed.

The cache returns context manager generators designed to load the
model into the GPU within the context, and unload outside the
context. Use like this:

   cache = ModelCache(max_cache_size=7.5)
   with cache.get_model('runwayml/stable-diffusion-1-5') as SD1,
          cache.get_model('stabilityai/stable-diffusion-2') as SD2:
       do_something_in_GPU(SD1,SD2)


"""

import gc
import math
import time
from contextlib import suppress
from logging import Logger
from typing import Dict, List, Optional

import torch

from invokeai.backend.model_manager import AnyModel, SubModelType
from invokeai.backend.model_manager.load.memory_snapshot import MemorySnapshot, get_pretty_snapshot_diff
from invokeai.backend.model_manager.load.model_cache.model_cache_base import (
    CacheRecord,
    CacheStats,
    ModelCacheBase,
    ModelLockerBase,
)
from invokeai.backend.model_manager.load.model_cache.model_locker import ModelLocker
from invokeai.backend.model_manager.load.model_util import calc_model_size_by_data
from invokeai.backend.util.devices import TorchDevice
from invokeai.backend.util.logging import InvokeAILogger

# Maximum size of the cache, in gigs
# Default is roughly enough to hold three fp16 diffusers models in RAM simultaneously
DEFAULT_MAX_CACHE_SIZE = 6.0

# amount of GPU memory to hold in reserve for use by generations (GB)
DEFAULT_MAX_VRAM_CACHE_SIZE = 2.75

# actual size of a gig
GIG = 1073741824

# Size of a MB in bytes.
MB = 2**20


class ModelCache(ModelCacheBase[AnyModel]):
    """Implementation of ModelCacheBase."""

    def __init__(
        self,
        max_cache_size: float = DEFAULT_MAX_CACHE_SIZE,
        max_vram_cache_size: float = DEFAULT_MAX_VRAM_CACHE_SIZE,
        execution_device: torch.device = torch.device("cuda"),
        storage_device: torch.device = torch.device("cpu"),
        precision: torch.dtype = torch.float16,
        sequential_offload: bool = False,
        lazy_offloading: bool = True,
        sha_chunksize: int = 16777216,
        log_memory_usage: bool = False,
        logger: Optional[Logger] = None,
    ):
        """
        Initialize the model RAM cache.

        :param max_cache_size: Maximum size of the RAM cache [6.0 GB]
        :param execution_device: Torch device to load active model into [torch.device('cuda')]
        :param storage_device: Torch device to save inactive model in [torch.device('cpu')]
        :param precision: Precision for loaded models [torch.float16]
        :param lazy_offloading: Keep model in VRAM until another model needs to be loaded
        :param sequential_offload: Conserve VRAM by loading and unloading each stage of the pipeline sequentially
        :param log_memory_usage: If True, a memory snapshot will be captured before and after every model cache
            operation, and the result will be logged (at debug level). There is a time cost to capturing the memory
            snapshots, so it is recommended to disable this feature unless you are actively inspecting the model cache's
            behaviour.
        """
        # allow lazy offloading only when vram cache enabled
        self._lazy_offloading = lazy_offloading and max_vram_cache_size > 0
        self._precision: torch.dtype = precision
        self._max_cache_size: float = max_cache_size
        self._max_vram_cache_size: float = max_vram_cache_size
        self._execution_device: torch.device = execution_device
        self._storage_device: torch.device = storage_device
        self._logger = logger or InvokeAILogger.get_logger(self.__class__.__name__)
        self._log_memory_usage = log_memory_usage
        self._stats: Optional[CacheStats] = None

        self._cached_models: Dict[str, CacheRecord[AnyModel]] = {}
        self._cache_stack: List[str] = []

    @property
    def logger(self) -> Logger:
        """Return the logger used by the cache."""
        return self._logger

    @property
    def lazy_offloading(self) -> bool:
        """Return true if the cache is configured to lazily offload models in VRAM."""
        return self._lazy_offloading

    @property
    def storage_device(self) -> torch.device:
        """Return the storage device (e.g. "CPU" for RAM)."""
        return self._storage_device

    @property
    def execution_device(self) -> torch.device:
        """Return the exection device (e.g. "cuda" for VRAM)."""
        return self._execution_device

    @property
    def max_cache_size(self) -> float:
        """Return the cap on cache size."""
        return self._max_cache_size

    @max_cache_size.setter
    def max_cache_size(self, value: float) -> None:
        """Set the cap on cache size."""
        self._max_cache_size = value

    @property
    def stats(self) -> Optional[CacheStats]:
        """Return collected CacheStats object."""
        return self._stats

    @stats.setter
    def stats(self, stats: CacheStats) -> None:
        """Set the CacheStats object for collectin cache statistics."""
        self._stats = stats

    def cache_size(self) -> int:
        """Get the total size of the models currently cached."""
        total = 0
        for cache_record in self._cached_models.values():
            total += cache_record.size
        return total

    def exists(
        self,
        key: str,
        submodel_type: Optional[SubModelType] = None,
    ) -> bool:
        """Return true if the model identified by key and submodel_type is in the cache."""
        key = self._make_cache_key(key, submodel_type)
        return key in self._cached_models

    def put(
        self,
        key: str,
        model: AnyModel,
        submodel_type: Optional[SubModelType] = None,
    ) -> None:
        """Store model under key and optional submodel_type."""
        key = self._make_cache_key(key, submodel_type)
        if key in self._cached_models:
            return
        size = calc_model_size_by_data(self.logger, model)
        self.make_room(size)

        state_dict = model.state_dict() if isinstance(model, torch.nn.Module) else None
        cache_record = CacheRecord(key=key, model=model, device=self.storage_device, state_dict=state_dict, size=size)
        self._cached_models[key] = cache_record
        self._cache_stack.append(key)

    def get(
        self,
        key: str,
        submodel_type: Optional[SubModelType] = None,
        stats_name: Optional[str] = None,
    ) -> ModelLockerBase:
        """
        Retrieve model using key and optional submodel_type.

        :param key: Opaque model key
        :param submodel_type: Type of the submodel to fetch
        :param stats_name: A human-readable id for the model for the purposes of
        stats reporting.

        This may raise an IndexError if the model is not in the cache.
        """
        key = self._make_cache_key(key, submodel_type)
        if key in self._cached_models:
            if self.stats:
                self.stats.hits += 1
        else:
            if self.stats:
                self.stats.misses += 1
            raise IndexError(f"The model with key {key} is not in the cache.")

        cache_entry = self._cached_models[key]

        # more stats
        if self.stats:
            stats_name = stats_name or key
            self.stats.cache_size = int(self._max_cache_size * GIG)
            self.stats.high_watermark = max(self.stats.high_watermark, self.cache_size())
            self.stats.in_cache = len(self._cached_models)
            self.stats.loaded_model_sizes[stats_name] = max(
                self.stats.loaded_model_sizes.get(stats_name, 0), cache_entry.size
            )

        # this moves the entry to the top (right end) of the stack
        with suppress(Exception):
            self._cache_stack.remove(key)
        self._cache_stack.append(key)
        return ModelLocker(
            cache=self,
            cache_entry=cache_entry,
        )

    def _capture_memory_snapshot(self) -> Optional[MemorySnapshot]:
        if self._log_memory_usage:
            return MemorySnapshot.capture()
        return None

    def _make_cache_key(self, model_key: str, submodel_type: Optional[SubModelType] = None) -> str:
        if submodel_type:
            return f"{model_key}:{submodel_type.value}"
        else:
            return model_key

    def offload_unlocked_models(self, size_required: int) -> None:
        """Move any unused models from VRAM."""
        reserved = self._max_vram_cache_size * GIG
        vram_in_use = torch.cuda.memory_allocated() + size_required
        self.logger.debug(f"{(vram_in_use/GIG):.2f}GB VRAM needed for models; max allowed={(reserved/GIG):.2f}GB")
        for _, cache_entry in sorted(self._cached_models.items(), key=lambda x: x[1].size):
            if vram_in_use <= reserved:
                break
            if not cache_entry.loaded:
                continue
            if not cache_entry.locked:
                self.move_model_to_device(cache_entry, self.storage_device)
                cache_entry.loaded = False
                vram_in_use = torch.cuda.memory_allocated() + size_required
                self.logger.debug(
                    f"Removing {cache_entry.key} from VRAM to free {(cache_entry.size/GIG):.2f}GB; vram free = {(torch.cuda.memory_allocated()/GIG):.2f}GB"
                )

        TorchDevice.empty_cache()

    def move_model_to_device(self, cache_entry: CacheRecord[AnyModel], target_device: torch.device) -> None:
        """Move model into the indicated device.

        :param cache_entry: The CacheRecord for the model
        :param target_device: The torch.device to move the model into

        May raise a torch.cuda.OutOfMemoryError
        """
        self.logger.debug(f"Called to move {cache_entry.key} to {target_device}")
        source_device = cache_entry.device

        # Note: We compare device types only so that 'cuda' == 'cuda:0'.
        # This would need to be revised to support multi-GPU.
        if torch.device(source_device).type == torch.device(target_device).type:
            return

        # Some models don't have a `to` method, in which case they run in RAM/CPU.
        if not hasattr(cache_entry.model, "to"):
            return

        # This roundabout method for moving the model around is done to avoid
        # the cost of moving the model from RAM to VRAM and then back from VRAM to RAM.
        # When moving to VRAM, we copy (not move) each element of the state dict from
        # RAM to a new state dict in VRAM, and then inject it into the model.
        # This operation is slightly faster than running `to()` on the whole model.
        #
        # When the model needs to be removed from VRAM we simply delete the copy
        # of the state dict in VRAM, and reinject the state dict that is cached
        # in RAM into the model. So this operation is very fast.
        start_model_to_time = time.time()
        snapshot_before = self._capture_memory_snapshot()

        try:
            if cache_entry.state_dict is not None:
                assert hasattr(cache_entry.model, "load_state_dict")
                if target_device == self.storage_device:
                    cache_entry.model.load_state_dict(cache_entry.state_dict, assign=True)
                else:
                    new_dict: Dict[str, torch.Tensor] = {}
                    for k, v in cache_entry.state_dict.items():
                        new_dict[k] = v.to(
                            target_device, copy=True, non_blocking=TorchDevice.get_non_blocking(target_device)
                        )
                    cache_entry.model.load_state_dict(new_dict, assign=True)
            try:
                cache_entry.model.to(target_device, non_blocking=TorchDevice.get_non_blocking(target_device))
            except TypeError as e:
                if "got an unexpected keyword argument 'non_blocking' in str(e)":
                    cache_entry.model.to(target_device)
                else:
                    raise e
            cache_entry.device = target_device
        except Exception as e:  # blow away cache entry
            self._delete_cache_entry(cache_entry)
            raise e

        snapshot_after = self._capture_memory_snapshot()
        end_model_to_time = time.time()
        self.logger.debug(
            f"Moved model '{cache_entry.key}' from {source_device} to"
            f" {target_device} in {(end_model_to_time-start_model_to_time):.2f}s."
            f"Estimated model size: {(cache_entry.size/GIG):.3f} GB."
            f"{get_pretty_snapshot_diff(snapshot_before, snapshot_after)}"
        )

        if (
            snapshot_before is not None
            and snapshot_after is not None
            and snapshot_before.vram is not None
            and snapshot_after.vram is not None
        ):
            vram_change = abs(snapshot_before.vram - snapshot_after.vram)

            # If the estimated model size does not match the change in VRAM, log a warning.
            if not math.isclose(
                vram_change,
                cache_entry.size,
                rel_tol=0.1,
                abs_tol=10 * MB,
            ):
                self.logger.debug(
                    f"Moving model '{cache_entry.key}' from {source_device} to"
                    f" {target_device} caused an unexpected change in VRAM usage. The model's"
                    " estimated size may be incorrect. Estimated model size:"
                    f" {(cache_entry.size/GIG):.3f} GB.\n"
                    f"{get_pretty_snapshot_diff(snapshot_before, snapshot_after)}"
                )

    def print_cuda_stats(self) -> None:
        """Log CUDA diagnostics."""
        vram = "%4.2fG" % (torch.cuda.memory_allocated() / GIG)
        ram = "%4.2fG" % (self.cache_size() / GIG)

        in_ram_models = 0
        in_vram_models = 0
        locked_in_vram_models = 0
        for cache_record in self._cached_models.values():
            if hasattr(cache_record.model, "device"):
                if cache_record.model.device == self.storage_device:
                    in_ram_models += 1
                else:
                    in_vram_models += 1
                if cache_record.locked:
                    locked_in_vram_models += 1

                self.logger.debug(
                    f"Current VRAM/RAM usage: {vram}/{ram}; models_in_ram/models_in_vram(locked) ="
                    f" {in_ram_models}/{in_vram_models}({locked_in_vram_models})"
                )

    def make_room(self, size: int) -> None:
        """Make enough room in the cache to accommodate a new model of indicated size."""
        # calculate how much memory this model will require
        # multiplier = 2 if self.precision==torch.float32 else 1
        bytes_needed = size
        maximum_size = self.max_cache_size * GIG  # stored in GB, convert to bytes
        current_size = self.cache_size()

        if current_size + bytes_needed > maximum_size:
            self.logger.debug(
                f"Max cache size exceeded: {(current_size/GIG):.2f}/{self.max_cache_size:.2f} GB, need an additional"
                f" {(bytes_needed/GIG):.2f} GB"
            )

        self.logger.debug(f"Before making_room: cached_models={len(self._cached_models)}")

        pos = 0
        models_cleared = 0
        while current_size + bytes_needed > maximum_size and pos < len(self._cache_stack):
            model_key = self._cache_stack[pos]
            cache_entry = self._cached_models[model_key]
            device = cache_entry.model.device if hasattr(cache_entry.model, "device") else None
            self.logger.debug(
                f"Model: {model_key}, locks: {cache_entry._locks}, device: {device}, loaded: {cache_entry.loaded}"
            )

            if not cache_entry.locked:
                self.logger.debug(
                    f"Removing {model_key} from RAM cache to free at least {(size/GIG):.2f} GB (-{(cache_entry.size/GIG):.2f} GB)"
                )
                current_size -= cache_entry.size
                models_cleared += 1
                self._delete_cache_entry(cache_entry)
                del cache_entry

            else:
                pos += 1

        if models_cleared > 0:
            # There would likely be some 'garbage' to be collected regardless of whether a model was cleared or not, but
            # there is a significant time cost to calling `gc.collect()`, so we want to use it sparingly. (The time cost
            # is high even if no garbage gets collected.)
            #
            # Calling gc.collect(...) when a model is cleared seems like a good middle-ground:
            # - If models had to be cleared, it's a signal that we are close to our memory limit.
            # - If models were cleared, there's a good chance that there's a significant amount of garbage to be
            #   collected.
            #
            # Keep in mind that gc is only responsible for handling reference cycles. Most objects should be cleaned up
            # immediately when their reference count hits 0.
            if self.stats:
                self.stats.cleared = models_cleared
            gc.collect()

        TorchDevice.empty_cache()
        self.logger.debug(f"After making room: cached_models={len(self._cached_models)}")

    def _delete_cache_entry(self, cache_entry: CacheRecord[AnyModel]) -> None:
        self._cache_stack.remove(cache_entry.key)
        del self._cached_models[cache_entry.key]
