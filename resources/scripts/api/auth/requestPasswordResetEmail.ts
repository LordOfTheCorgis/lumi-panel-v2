import http from '@/api/http';

export default (email: string, captchaData?: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        http.post('/auth/password', { email, 'cf-turnstile-response': captchaData })
            .then((response) => resolve(response.data.status || ''))
            .catch(reject);
    });
};
