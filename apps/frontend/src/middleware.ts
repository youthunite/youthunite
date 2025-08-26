import { defineMiddleware } from 'astro:middleware';
import { getServerUser, getTokenFromCookie } from './lib/server/auth';

// TODO: THIS NEEDS A REFACTOR. ASAP.
export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, redirect } = context;
  
  const isCourseRoute = url.pathname.startsWith('/courses');
  
  if (isCourseRoute) {
    const cookieHeader = request.headers.get('cookie');
    const token = getTokenFromCookie(cookieHeader);
    
    if (!token) {
      return redirect('/login?redirect=' + encodeURIComponent(url.pathname));
    }
    
    const user = await getServerUser(token);
    
    if (!user) {
      return redirect('/login?redirect=' + encodeURIComponent(url.pathname));
    }
    
    // @ts-ignore just uh
    context.locals.user = user;
  }

  if (url.pathname === '/events/register') {
    const cookieHeader = request.headers.get('cookie');
    const token = getTokenFromCookie(cookieHeader);

    if (!token) {
      return redirect('/login?redirect=' + encodeURIComponent(url.pathname));
    }
    const user = await getServerUser(token);
    if (!user) {
      return redirect('/login?redirect=' + encodeURIComponent(url.pathname));
    }
    // @ts-ignore just uh
    context.locals.user = user;
  }
  
  return next();
});