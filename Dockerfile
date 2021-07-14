FROM alpine

ENV APP_HOME /usr/src/app
ENV DEFAULT /etc/nginx/http.d/default.conf

WORKDIR $APP_HOME

RUN apk update && \
 apk add --no-cache nginx && \
 rm -fr /var/cache/apk/*

ADD ./docker $APP_HOME
ADD ./build /var/www/html

RUN rm $DEFAULT
RUN mv default $DEFAULT

CMD sh start.sh
