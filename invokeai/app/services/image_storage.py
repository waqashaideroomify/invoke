# Copyright (c) 2022 Kyle Schouviller (https://github.com/kyle0654)

import datetime
import os
import json
from glob import glob
from abc import ABC, abstractmethod
from pathlib import Path
from queue import Queue
from typing import Any, Dict, List, Tuple

from PIL.Image import Image
import PIL.Image as PILImage
from PIL import PngImagePlugin
from invokeai.app.api.models.images import ImageResponse
from invokeai.app.models.image import  ImageType
from invokeai.app.modules.metadata import ImageMetadata, InvokeAIMetadata, MetadataModule
from invokeai.app.services.item_storage import PaginatedResults
from invokeai.app.util.get_timestamp import get_timestamp
from invokeai.app.util.thumbnails import get_thumbnail_name, make_thumbnail

from invokeai.backend.image_util import PngWriter


class ImageStorageBase(ABC):
    """Responsible for storing and retrieving images."""

    @abstractmethod
    def get(self, image_type: ImageType, image_name: str) -> Image:
        """Retrieves an image as PIL Image."""
        pass

    @abstractmethod
    def list(
        self, image_type: ImageType, page: int = 0, per_page: int = 10
    ) -> PaginatedResults[ImageResponse]:
        """Gets a paginated list of images."""
        pass

    # TODO: make this a bit more flexible for e.g. cloud storage
    @abstractmethod
    def get_path(
        self, image_type: ImageType, image_name: str, is_thumbnail: bool = False
    ) -> str:
        """Gets the path to an image or its thumbnail."""
        pass

    # TODO: make this a bit more flexible for e.g. cloud storage
    @abstractmethod
    def validate_path(
        self, path: str
    ) -> bool:
        """Validates an image path."""
        pass

    @abstractmethod
    def save(self, image_type: ImageType, image_name: str, image: Image, metadata: InvokeAIMetadata | None = None) -> Tuple[str, str, int]:
        """Saves an image and a 256x256 WEBP thumbnail. Returns a tuple of the image path, thumbnail path, and created timestamp."""
        pass

    @abstractmethod
    def delete(self, image_type: ImageType, image_name: str) -> None:
        """Deletes an image and its thumbnail (if one exists)."""
        pass

    def create_name(self, context_id: str, node_id: str) -> str:
        """Creates a unique contextual image filename."""
        return f"{context_id}_{node_id}_{str(get_timestamp())}.png"


class DiskImageStorage(ImageStorageBase):
    """Stores images on disk"""

    __output_folder: str
    __cache_ids: Queue  # TODO: this is an incredibly naive cache
    __cache: Dict[str, Image]
    __max_cache_size: int

    def __init__(self, output_folder: str):
        self.__output_folder = output_folder
        self.__cache = dict()
        self.__cache_ids = Queue()
        self.__max_cache_size = 10  # TODO: get this from config

        Path(output_folder).mkdir(parents=True, exist_ok=True)

        # TODO: don't hard-code. get/save/delete should maybe take subpath?
        for image_type in ImageType:
            Path(os.path.join(output_folder, image_type)).mkdir(
                parents=True, exist_ok=True
            )
            Path(os.path.join(output_folder, image_type, "thumbnails")).mkdir(
                parents=True, exist_ok=True
            )

    def list(
        self, image_type: ImageType, page: int = 0, per_page: int = 10
    ) -> PaginatedResults[ImageResponse]:
        dir_path = os.path.join(self.__output_folder, image_type)
        image_paths = glob(f"{dir_path}/*.png")
        count = len(image_paths)

        sorted_image_paths = sorted(
            glob(f"{dir_path}/*.png"), key=os.path.getctime, reverse=True
        )

        page_of_image_paths = sorted_image_paths[
            page * per_page : (page + 1) * per_page
        ]

        page_of_images: List[ImageResponse] = []

        for path in page_of_image_paths:
            filename = os.path.basename(path)
            img = PILImage.open(path)
            
            invokeai_metadata = MetadataModule.get_metadata(img)

            page_of_images.append(
                ImageResponse(
                    image_type=image_type.value,
                    image_name=filename,
                    # TODO: DiskImageStorage should not be building URLs...?
                    image_url=f"api/v1/images/{image_type.value}/{filename}",
                    thumbnail_url=f"api/v1/images/{image_type.value}/thumbnails/{os.path.splitext(filename)[0]}.webp",
                    # TODO: Creation of this object should happen elsewhere (?), just making it fit here so it works
                    metadata=ImageMetadata(
                        created=int(os.path.getctime(path)),
                        width=img.width,
                        height=img.height,
                        mode=img.mode,
                        invokeai=invokeai_metadata
                    ),
                )
            )

        page_count_trunc = int(count / per_page)
        page_count_mod = count % per_page
        page_count = page_count_trunc if page_count_mod == 0 else page_count_trunc + 1

        return PaginatedResults[ImageResponse](
            items=page_of_images,
            page=page,
            pages=page_count,
            per_page=per_page,
            total=count,
        )

    def get(self, image_type: ImageType, image_name: str) -> Image:
        image_path = self.get_path(image_type, image_name)
        cache_item = self.__get_cache(image_path)
        if cache_item:
            return cache_item

        image = PILImage.open(image_path)
        self.__set_cache(image_path, image)
        return image

    # TODO: make this a bit more flexible for e.g. cloud storage
    def get_path(
        self, image_type: ImageType, image_name: str, is_thumbnail: bool = False
    ) -> str:
        # strip out any relative path shenanigans
        basename = os.path.basename(image_name)

        if is_thumbnail:
            path = os.path.join(
                self.__output_folder, image_type, "thumbnails", basename
            )
        else:
            path = os.path.join(self.__output_folder, image_type, basename)

        return path

    def validate_path(
        self, path: str
    ) -> bool:
        try:
            os.stat(path)
            return True
        except Exception:
            return False


    def save(self, image_type: ImageType, image_name: str, image: Image, metadata: InvokeAIMetadata | None = None) -> Tuple[str, str, int]:
        image_path = self.get_path(image_type, image_name)

        thumbnail_name = get_thumbnail_name(image_name)
        thumbnail_path = self.get_path(image_type, thumbnail_name, is_thumbnail=True)

        png_info = MetadataModule.build_png_info(metadata=metadata)

        image.save(image_path, "PNG", pnginfo=png_info)

        thumbnail_image = make_thumbnail(image)
        thumbnail_image.save(thumbnail_path)

        self.__set_cache(image_path, image)
        self.__set_cache(thumbnail_path, thumbnail_image)

        return (image_path, thumbnail_path, int(os.path.getctime(image_path)))

    def delete(self, image_type: ImageType, image_name: str) -> None:
        image_path = self.get_path(image_type, image_name)
        thumbnail_path = self.get_path(image_type, image_name, True)
        if os.path.exists(image_path):
            os.remove(image_path)

        if image_path in self.__cache:
            del self.__cache[image_path]

        if os.path.exists(thumbnail_path):
            os.remove(thumbnail_path)

        if thumbnail_path in self.__cache:
            del self.__cache[thumbnail_path]

    def __get_cache(self, image_name: str) -> Image:
        return None if image_name not in self.__cache else self.__cache[image_name]

    def __set_cache(self, image_name: str, image: Image):
        if not image_name in self.__cache:
            self.__cache[image_name] = image
            self.__cache_ids.put(
                image_name
            )  # TODO: this should refresh position for LRU cache
            if len(self.__cache) > self.__max_cache_size:
                cache_id = self.__cache_ids.get()
                del self.__cache[cache_id]
