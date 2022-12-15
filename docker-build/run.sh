#!/usr/bin/env bash
set -e

source ./docker-build/env.sh \
  || echo "please run from repository root" \
  || exit 1

# check if HUGGINGFACE_TOKEN is available
huggingface_token=${HUGGINGFACE_TOKEN:?Please set your token for Huggingface as HUGGINGFACE_TOKEN}

echo -e "You are using these values:\n"
echo -e "volumename:\t ${volumename}"
echo -e "invokeai_tag:\t ${invokeai_tag}\n"

docker run \
  --interactive \
  --tty \
  --rm \
  --platform="$platform" \
  --name="$repository_name_lc" \
  --hostname="$repository_name_lc" \
  --mount="source=$volumename,target=/data" \
  --env="HUGGINGFACE_TOKEN=${huggingface_token}" \
  --publish=9090:9090 \
  --cap-add=sys_nice \
  $gpus \
  "$invokeai_tag" ${1:+$@}
