import http from '@/api/http';

export const uploadAvatar = async (file: File): Promise<string> => {
    const body = new FormData();
    body.append('avatar', file);

    const { data } = await http.post('/api/client/account/avatar', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data.url;
};

export const removeAvatar = async (): Promise<void> => {
    await http.delete('/api/client/account/avatar');
};
