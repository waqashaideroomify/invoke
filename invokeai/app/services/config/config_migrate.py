# Copyright 2024 Lincoln D. Stein and the InvokeAI Development Team

"""
Utility class for migrating among versions of the InvokeAI app config schema.
"""

from dataclasses import dataclass
from typing import Any, Callable, List, TypeAlias

from packaging.version import Version

AppConfigDict: TypeAlias = dict[str, Any]
MigrationFunction: TypeAlias = Callable[[AppConfigDict], AppConfigDict]


@dataclass
class MigrationEntry:
    """Defines an individual migration."""

    from_version: Version
    to_version: Version
    function: MigrationFunction


class ConfigMigrator:
    """This class allows migrators to register their input and output versions."""

    _migrations: List[MigrationEntry] = []

    @classmethod
    def register(
        cls,
        from_version: str,
        to_version: str,
    ) -> Callable[[MigrationFunction], MigrationFunction]:
        """Define a decorator which registers the migration between two versions."""

        def decorator(function: MigrationFunction) -> MigrationFunction:
            if any(from_version == m.from_version for m in cls._migrations):
                raise ValueError(
                    f"function {function.__name__} is trying to register a migration for version {str(from_version)}, but this migration has already been registered."
                )
            cls._migrations.append(
                MigrationEntry(from_version=Version(from_version), to_version=Version(to_version), function=function)
            )
            return function

        return decorator

    @staticmethod
    def _check_for_discontinuities(migrations: List[MigrationEntry]) -> None:
        current_version = Version("3.0.0")
        for m in migrations:
            if current_version != m.from_version:
                raise ValueError(
                    f"Migration functions are not continuous. Expected from_version={current_version} but got from_version={m.from_version}, for migration function {m.function.__name__}"
                )
            current_version = m.to_version

    @classmethod
    def migrate(cls, config_dict: AppConfigDict) -> AppConfigDict:
        """
        Use the registered migration steps to bring config up to latest version.

        :param config: The original configuration.
        :return: The new configuration, lifted up to the latest version.

        As a side effect, the new configuration will be written to disk.
        If an inconsistency in the registered migration steps' `from_version`
        and `to_version` parameters are identified, this will raise a
        ValueError exception.
        """
        # Sort migrations by version number and raise a ValueError if
        # any version range overlaps are detected.
        sorted_migrations = sorted(cls._migrations, key=lambda x: x.from_version)
        cls._check_for_discontinuities(sorted_migrations)

        if "InvokeAI" in config_dict:
            version = Version("3.0.0")
        else:
            version = Version(config_dict["schema_version"])

        for migration in sorted_migrations:
            if version == migration.from_version and version < migration.to_version:
                config_dict = migration.function(config_dict)
                version = migration.to_version

        config_dict["schema_version"] = str(version)
        return config_dict
