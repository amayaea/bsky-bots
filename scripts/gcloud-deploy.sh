#!/bin/sh

source .env 

docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY_NAME

