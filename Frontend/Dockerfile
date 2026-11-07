FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js /usr/share/nginx/html/
COPY config.docker.js /usr/share/nginx/html/config.js
EXPOSE 80
