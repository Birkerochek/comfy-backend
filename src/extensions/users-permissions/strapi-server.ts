// strapi-backend/src/extensions/users-permissions/strapi-server.ts

import type { Core } from '@strapi/strapi';
import * as Iron from '@hapi/iron';
console.log('✅ users-permissions extension loaded');

// Функция валидации пароля
const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  // Проверка минимальной длины (8 символов)
  if (password.length < 8) {
    return { isValid: false, error: 'Пароль должен содержать минимум 8 символов' };
  }

  // Проверка первого символа (должен быть заглавным)
  if (!/^[A-ZА-Я]/.test(password)) {
    return { isValid: false, error: 'Первый символ пароля должен быть заглавной буквой' };
  }

  // Проверка наличия специального символа
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Пароль должен содержать минимум один специальный символ' };
  }

  return { isValid: true };
};

// Плагин приходит в функцию расширения
export default (plugin: any) => {
  // Сохраняем оригинальные методы
  const originalRegister = plugin.controllers.auth.register;
  const originalCallback = plugin.controllers.auth.callback;

  // Переопределяем контроллер регистрации
  plugin.controllers.auth.register = async (ctx: any) => {
    try {
      // Проверяем пароль перед регистрацией
      const { password } = ctx.request.body;
      console.log('Проверка пароля при регистрации:', password);
      const passwordValidation = validatePassword(password);
      
      if (!passwordValidation.isValid) {
        console.log('Ошибка валидации пароля:', passwordValidation.error);
        return ctx.badRequest('Ошибка валидации', [{ messages: [{ id: 'Password.error', message: passwordValidation.error }] }]);
      }
      console.log(ctx.request.body);

      console.log('Пароль прошел валидацию, продолжаем регистрацию');
      // Если валидация прошла успешно, вызываем стандартную логику Strapi: создание юзера + JWT
      const result = await originalRegister(ctx);
      console.log('Результат регистрации:', result);
      return result;
    } catch (error) {
      console.error('Ошибка в процессе регистрации:', error);
      throw error;
    }
  };
  
  // Переопределяем контроллер входа в систему
  plugin.controllers.auth.callback = async (ctx: any) => {
    try {
      // Получаем данные из запроса
      const { identifier, password } = ctx.request.body;
      
      console.log('Проверка пароля при входе:', password);
      // Проверяем пароль перед входом в систему
      const passwordValidation = validatePassword(password);
      
      if (!passwordValidation.isValid) {
        console.log('Ошибка валидации пароля при входе:', passwordValidation.error);
        return ctx.badRequest('Ошибка валидации', [{ messages: [{ id: 'Password.error', message: passwordValidation.error }] }]);
      }
      
      console.log('Пароль прошел валидацию, продолжаем вход');
      // Если валидация прошла успешно, вызываем стандартную логику Strapi
      await originalCallback(ctx);

      // 2) После этого Strapi кладёт в ctx.body: { jwt, user }
      const { jwt, user } = ctx.body;

      // 3) «Запечатываем» роль в защищённую куку
      const sealedRole = await Iron.seal(
        { role: user.role?.name ?? 'guest' },
        process.env.IRON_PASSWORD!,   // задайте в .env строку ≥ 32 байта
        Iron.defaults
      );
      const isProd = process.env.NODE_ENV === 'production';
      // 4) Ставим HttpOnly-куку с зашифрованной ролью
      ctx.cookies.set('userRole', sealedRole, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax', // для продакшена, когда HTTPS
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
        path: '/',
        domain: 'localhost'
      });

      // 5) Возвращаем клиенту прежний ответ (jwt + user)
      ctx.body = { jwt, user };
    } catch (error) {
      console.error('Ошибка в процессе входа:', error);
      throw error;
    }
  };

  // Добавляем обработку изменения пароля
  const originalUpdateMe = plugin.controllers.user.updateMe;
  
  plugin.controllers.user.updateMe = async (ctx: any) => {
    try {
      // Проверяем, есть ли в запросе обновление пароля
      if (ctx.request.body?.password) {
        const { password } = ctx.request.body;
        
        console.log('Проверка пароля при обновлении профиля:', password);
        // Валидируем новый пароль
        const passwordValidation = validatePassword(password);
        
        if (!passwordValidation.isValid) {
          console.log('Ошибка валидации пароля при обновлении профиля:', passwordValidation.error);
          return ctx.badRequest('Ошибка валидации', [{ messages: [{ id: 'Password.error', message: passwordValidation.error }] }]);
        }
        console.log('Пароль прошел валидацию, продолжаем обновление профиля');
      }
      
      // Если валидация прошла успешно или пароль не меняется, вызываем стандартную логику Strapi
      const result = await originalUpdateMe(ctx);
      return result;
    } catch (error) {
      console.error('Ошибка в процессе обновления профиля:', error);
      throw error;
    }
  };
  
  // Добавляем валидацию для сброса пароля
  const originalResetPassword = plugin.controllers.auth.resetPassword;
  
  plugin.controllers.auth.resetPassword = async (ctx: any) => {
    try {
      // Получаем пароль из запроса
      const { password } = ctx.request.body;
      
      console.log('Проверка пароля при сбросе:', password);
      // Валидируем новый пароль
      const passwordValidation = validatePassword(password);
      
      if (!passwordValidation.isValid) {
        console.log('Ошибка валидации пароля при сбросе:', passwordValidation.error);
        return ctx.badRequest('Ошибка валидации', [{ messages: [{ id: 'Password.error', message: passwordValidation.error }] }]);
      }
      
      console.log('Пароль прошел валидацию, продолжаем сброс пароля');
      // Если валидация прошла успешно, вызываем стандартную логику Strapi
      const result = await originalResetPassword(ctx);
      return result;
    } catch (error) {
      console.error('Ошибка в процессе сброса пароля:', error);
      throw error;
    }
  };
  
  return plugin;
};
