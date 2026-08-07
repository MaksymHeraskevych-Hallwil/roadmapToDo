# Використовуємо оптимізований образ Node.js
FROM node:22-alpine

WORKDIR /app

# Копіюємо список залежностей
COPY package*.json ./

# Встановлюємо залежності
RUN npm install

# Копіюємо решту файлів
COPY . .

# Робимо "білд" Next.js додатку
# В Next.js .env зчитується під час білду, але поки пропускаємо
RUN npm run build

# Відкриваємо 3000 порт
EXPOSE 3000

# Запускаємо сервер Next.js
CMD ["npm", "start"]