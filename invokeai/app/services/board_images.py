from abc import ABC, abstractmethod
from logging import Logger
from typing import List, Optional, Union

from invokeai.app.models.image import (AddManyImagesToBoardResult,
                                       GetAllBoardImagesForBoardResult,
                                       RemoveManyImagesFromBoardResult)
from invokeai.app.services.board_image_record_storage import \
    BoardImageRecordStorageBase
from invokeai.app.services.board_record_storage import (BoardRecord,
                                                        BoardRecordStorageBase)
from invokeai.app.services.image_record_storage import (ImageRecordStorageBase,
                                                        OffsetPaginatedResults)
from invokeai.app.services.models.board_record import BoardDTO
from invokeai.app.services.models.image_record import (ImageDTO,
                                                       image_record_to_dto)
from invokeai.app.services.urls import UrlServiceBase


class BoardImagesServiceABC(ABC):
    """High-level service for board-image relationship management."""

    @abstractmethod
    def add_image_to_board(
        self,
        board_id: str,
        image_name: str,
    ) -> None:
        """Adds an image to a board. If the image is on a different board, it is removed from that board."""
        pass

    @abstractmethod
    def add_many_images_to_board(
        self,
        board_id: str,
        image_names: list[str],
    ) -> AddManyImagesToBoardResult:
        """Adds many images to a board. If an image is on a different board, it is removed from that board."""
        pass

    @abstractmethod
    def remove_image_from_board(
        self,
        image_name: str,
    ) -> None:
        """Removes an image from its board."""
        pass

    @abstractmethod
    def remove_many_images_from_board(
        self,
        image_names: list[str],
    ) -> RemoveManyImagesFromBoardResult:
        """Removes many images from their board, if they had one."""
        pass

    @abstractmethod
    def get_all_board_images_for_board(
        self,
        board_id: str,
    ) -> GetAllBoardImagesForBoardResult:
        """Gets all image names for a board."""
        pass

    @abstractmethod
    def get_board_for_image(
        self,
        image_name: str,
    ) -> Optional[str]:
        """Gets an image's board id, if it has one."""
        pass


class BoardImagesServiceDependencies:
    """Service dependencies for the BoardImagesService."""

    board_image_records: BoardImageRecordStorageBase
    board_records: BoardRecordStorageBase
    image_records: ImageRecordStorageBase
    urls: UrlServiceBase
    logger: Logger

    def __init__(
        self,
        board_image_record_storage: BoardImageRecordStorageBase,
        image_record_storage: ImageRecordStorageBase,
        board_record_storage: BoardRecordStorageBase,
        url: UrlServiceBase,
        logger: Logger,
    ):
        self.board_image_records = board_image_record_storage
        self.image_records = image_record_storage
        self.board_records = board_record_storage
        self.urls = url
        self.logger = logger


class BoardImagesService(BoardImagesServiceABC):
    _services: BoardImagesServiceDependencies

    def __init__(self, services: BoardImagesServiceDependencies):
        self._services = services

    def add_image_to_board(
        self,
        board_id: str,
        image_name: str,
    ) -> None:
        self._services.board_image_records.add_image_to_board(board_id, image_name)

    def add_many_images_to_board(
        self,
        board_id: str,
        image_names: list[str],
    ) -> AddManyImagesToBoardResult:
        added_images: list[str] = []

        for image_name in image_names:
            try:
                self._services.board_image_records.add_image_to_board(
                    board_id, image_name
                )
                added_images.append(image_name)
            except Exception as e:
                self._services.logger.exception(e)

        total = self._services.board_image_records.get_image_count_for_board(board_id)

        return AddManyImagesToBoardResult(
            board_id=board_id, added_images=added_images, total=total
        )

    def remove_image_from_board(
        self,
        image_name: str,
    ) -> None:
        self._services.board_image_records.remove_image_from_board(image_name)

    def remove_many_images_from_board(
        self,
        image_names: list[str],
    ) -> RemoveManyImagesFromBoardResult:
        removed_images: list[str] = []

        for image_name in image_names:
            try:
                self._services.board_image_records.remove_image_from_board(image_name)
                removed_images.append(image_name)
            except Exception as e:
                self._services.logger.exception(e)

        return RemoveManyImagesFromBoardResult(
            removed_images=removed_images,
        )

    def get_all_board_images_for_board(
        self,
        board_id: str,
    ) -> GetAllBoardImagesForBoardResult:
        result = self._services.board_image_records.get_all_board_images_for_board(
            board_id
        )
        return result

    def get_board_for_image(
        self,
        image_name: str,
    ) -> Optional[str]:
        board_id = self._services.board_image_records.get_board_for_image(image_name)
        return board_id


def board_record_to_dto(
    board_record: BoardRecord, cover_image_name: Optional[str], image_count: int
) -> BoardDTO:
    """Converts a board record to a board DTO."""
    return BoardDTO(
        **board_record.dict(exclude={"cover_image_name"}),
        cover_image_name=cover_image_name,
        image_count=image_count,
    )
