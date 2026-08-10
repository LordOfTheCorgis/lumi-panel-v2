import http from '@/api/http';

export type AnnouncementType = 'info' | 'success' | 'warning' | 'danger';

export interface Announcement {
    id: number;
    title: string;
    content: string;
    type: AnnouncementType;
    updatedAt: string;
}

export const rawDataToAnnouncement = ({ attributes }: any): Announcement => ({
    id: attributes.id,
    title: attributes.title,
    content: attributes.content,
    type: attributes.type,
    updatedAt: attributes.updated_at,
});

export default (): Promise<Announcement[]> =>
    http.get('/api/client/announcements').then(({ data }) => (data.data || []).map(rawDataToAnnouncement));
