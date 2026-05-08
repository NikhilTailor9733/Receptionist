FROM node:22

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    wget \
    gnupg \
    libglib2.0-0 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libx11-xcb1 \
    libxshmfence1 \
    libxext6 \
    libx11-6 \
    fonts-liberation

WORKDIR /app

COPY . .

RUN pip3 install -r /app/requirements.txt

WORKDIR /app/backend

RUN npm install

RUN npx puppeteer browsers install chrome

EXPOSE 8080

CMD ["npm", "start"]