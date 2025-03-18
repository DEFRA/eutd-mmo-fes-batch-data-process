# This assumes that the parent image has been built locally using production and development build configuration as defra-node
# and defra-node-development tagged with a version.
ARG NPM_TOKEN
ARG DEFRA_BASE_IMAGE_TAG=latest-22
FROM defradigital/node-development:$DEFRA_BASE_IMAGE_TAG as base

# We have production dependencies requiring node-gyp builds which don't
#   install cleanly with the defradigital/node image. So we'll install them here
#   and set NODE_ENV to production before copying them to the production image.
ENV NODE_ENV production

# Set the port that is going to be exposed later on in the Dockerfile as well.
ARG PORT=9000
ENV PORT=${PORT}

ARG GIT_HASH=""

# This installs the exact versions of the packages
#   listed in package-lock.json, and does not update either the package-lock.json
#   or the package.json file.
USER root
RUN mkdir /app && chown node:node /app
USER node

COPY --chown=node:node package*.json .npmrc /app/
WORKDIR /app

RUN npm ci --legacy-peer-deps

# Using the development image (which has NODE_ENV=development) we will install
#   all devDependencies & build the project.
FROM defradigital/node-development:$DEFRA_BASE_IMAGE_TAG as test
USER root
# mongodb-memory-server used by the test suite requires mongodb but no mongodb
#   packages are regularly built for mongodb. Here we add a version
#   from the 3.9 community repository.
RUN echo 'http://dl-cdn.alpinelinux.org/alpine/v3.9/main' >> /etc/apk/repositories
RUN echo 'http://dl-cdn.alpinelinux.org/alpine/v3.9/community' >> /etc/apk/repositories
# yaml-cpp must be pinned on >3.9
#   https://unix.stackexchange.com/a/569565
RUN apk add --no-cache mongodb yaml-cpp=0.6.2-r2
USER node
ENV MONGOMS_SYSTEM_BINARY=/usr/bin/mongod

USER root
RUN mkdir /app && chown node:node /app
USER node

COPY --chown=node:node . /app
COPY --from=base --chown=node:node /app/node_modules/ /app/node_modules/
WORKDIR /app
RUN npm ci --legacy-peer-deps
CMD ["npm", "run", "test"]

FROM test as development
RUN npm run build
CMD ["node", "dist/start.js"]

# Production stage exposes service port, copies in built app code and declares the Node app as the default command
FROM defradigital/node:$DEFRA_BASE_IMAGE_TAG as production

USER root
RUN mkdir /app && chown node:node /app
USER node

# Copy in the files that we built using the tools in the development stage. The final production stage will have the built files,
#   but none of the tools required to build those files. This reduces the attack surface, and also the size of the final production image
COPY --from=base --chown=node:node /app/node_modules/ /app/node_modules/
COPY --from=development --chown=node:node /app/dist/ /app/dist/
COPY --chown=node:node data/ /app/data/
RUN echo $GIT_HASH > githash

# Again, be explict about the permissions we want for this stage
USER node
WORKDIR /app

# Expose the PORT passed in at the start of the file
EXPOSE ${PORT}

#The base node image sets a very verbose log level, we're just going to warn
ENV NPM_CONFIG_LOGLEVEL=info
ENV NODE_OPTIONS=--max_old_space_size=24576
# This is the command that is run for the production service. The parent image has an ENTRYPOINT that uses a lightweight
#   init program "tini" that handles signals. As long as we don't override the ENTRYPOINT the "tini" routine will handle signals and
#   orphaned processes
CMD ["node", "dist/start.js"]
