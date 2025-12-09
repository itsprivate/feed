FROM denoland/deno:2.5.6

WORKDIR /app

# Copy all source files
COPY . .

# Cache dependencies
RUN deno cache --allow-import deps.ts

# Cache the main entry point
RUN deno cache --allow-import serve-archive-site.ts

EXPOSE 8000

ENV PROD=1

CMD ["deno", "run", "-A", "serve-archive-site.ts"]
