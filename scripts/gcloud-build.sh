#!/bin/sh

source .env

docker buildx build --platform linux/amd64 -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY_NAME .