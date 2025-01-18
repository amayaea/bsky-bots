#!/bin/sh

source .env

for dir in bots/*; do
  if [ -d "$dir" ]; then
    FOLDER=$(basename "$dir")
    docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$FOLDER:dev
  fi
done
