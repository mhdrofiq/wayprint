import type { Pin, Image } from '@/types';

export const PINS: Pin[] = [
  { id: '1', label: 'Shinjuku Station', lat: 35.6896, lng: 139.6917 },
  { id: '2', label: 'Shibuya Crossing', lat: 35.6595, lng: 139.7004 },
  { id: '3', label: 'Tokyo Tower', lat: 35.6586, lng: 139.7454 },
  { id: '4', label: 'Asakusa Senso-ji', lat: 35.7148, lng: 139.7967 },
  { id: '5', label: 'Akihabara', lat: 35.6982, lng: 139.7731 },
];

export const IMAGES: Record<string, Image[]> = {
  '1': [
    { id: 'i1', pin_id: '1', url: '/photos/photo-1.svg', thumb_url: '/photos/photo-1.svg', caption: 'Golden Gai at night', sort_order: 0 },
    { id: 'i2', pin_id: '1', url: '/photos/photo-2.svg', thumb_url: '/photos/photo-2.svg', caption: 'Kabukicho neon lights', sort_order: 1 },
    { id: 'i3', pin_id: '1', url: '/photos/photo-3.svg', thumb_url: '/photos/photo-3.svg', caption: 'Shinjuku station east exit', sort_order: 2 },
  ],
  '2': [
    { id: 'i4', pin_id: '2', url: '/photos/photo-2.svg', thumb_url: '/photos/photo-2.svg', caption: 'Hanamikoji street', sort_order: 0 },
    { id: 'i5', pin_id: '2', url: '/photos/photo-4.svg', thumb_url: '/photos/photo-4.svg', caption: 'Geisha district lanterns', sort_order: 1 },
  ],
  '3': [
    { id: 'i6', pin_id: '3', url: '/photos/photo-3.svg', thumb_url: '/photos/photo-3.svg', caption: 'Dotonbori canal', sort_order: 0 },
    { id: 'i7', pin_id: '3', url: '/photos/photo-5.svg', thumb_url: '/photos/photo-5.svg', caption: 'Glico running man sign', sort_order: 1 },
    { id: 'i8', pin_id: '3', url: '/photos/photo-1.svg', thumb_url: '/photos/photo-1.svg', caption: 'Takoyaki stall', sort_order: 2 },
    { id: 'i9', pin_id: '3', url: '/photos/photo-2.svg', thumb_url: '/photos/photo-2.svg', caption: 'Ebisu Bridge', sort_order: 3 },
  ],
  '4': [
    { id: 'i10', pin_id: '4', url: '/photos/photo-4.svg', thumb_url: '/photos/photo-4.svg', caption: 'Odori Park in autumn', sort_order: 0 },
    { id: 'i11', pin_id: '4', url: '/photos/photo-5.svg', thumb_url: '/photos/photo-5.svg', caption: 'Sapporo TV Tower', sort_order: 1 },
  ],
  '5': [
    { id: 'i12', pin_id: '5', url: '/photos/photo-5.svg', thumb_url: '/photos/photo-5.svg', caption: 'Atomic Bomb Dome', sort_order: 0 },
    { id: 'i13', pin_id: '5', url: '/photos/photo-1.svg', thumb_url: '/photos/photo-1.svg', caption: 'Peace Bell', sort_order: 1 },
    { id: 'i14', pin_id: '5', url: '/photos/photo-3.svg', thumb_url: '/photos/photo-3.svg', caption: 'Paper cranes memorial', sort_order: 2 },
  ],
};
