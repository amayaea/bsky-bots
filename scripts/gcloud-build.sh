#!/bin/sh

source .env

for dir in bots/*; do
  if [ -d "$dir" ]; then
    FOLDER=$(basename "$dir")
    docker buildx build --platform linux/amd64 -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$FOLDER:dev -f $dir/Dockerfile .
  fi
done