FROM alpine:latest as alpine

RUN apk --no-cache add tzdata zip ca-certificates

WORKDIR /usr/share/zoneinfo

RUN zip -r -0 /zoneinfo.zip .

FROM scratch

MAINTAINER squat <lserven@gmail.com>

ENV ZONEINFO /zoneinfo.zip

COPY --from=alpine /zoneinfo.zip /

COPY --from=alpine /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

ARG ARCH

ADD bin/${ARCH}/bs /bs

USER nobody:nobody

ENTRYPOINT ["/bs"]
