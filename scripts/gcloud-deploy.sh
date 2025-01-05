#!/bin/sh

source .env 

docker push $REGION_CODE-docker.pkg.dev/$PROJECT_ID/$REPOSITORY_NAME

