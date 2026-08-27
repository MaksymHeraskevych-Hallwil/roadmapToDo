# Використовуємо оптимізований образ Node.js
FROM node:22-alpine

WORKDIR /app

# Копіюємо список залежностей
COPY package*.json ./

# Встановлюємо залежності
RUN npm install

# Копіюємо решту файлів
COPY . .

# Адресу API треба знати вже на етапі білду:
# Next.js вшиває NEXT_PUBLIC_* змінні прямо в клієнтський бандл.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Робимо "білд" Next.js додатку
RUN npm run build

# Відкриваємо 3000 порт
EXPOSE 3000

# Запускаємо сервер Next.js
CMD ["npm", "start"]