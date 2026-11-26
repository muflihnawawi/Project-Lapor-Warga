import { Construction, Lightbulb, Droplets, Trash2, Trees, Leaf } from 'lucide-react';

const MAP = [
  [/lampu|penerangan/i, Lightbulb, 'bg-yellow-50 text-yellow-600'],
  [/jalan|infrastruktur/i, Construction, 'bg-orange-50 text-orange-600'],
  [/drainase|air|banjir/i, Droplets, 'bg-sky-50 text-sky-600'],
  [/sampah|kebersihan/i, Trash2, 'bg-lime-50 text-lime-700'],
  [/fasilitas|taman/i, Trees, 'bg-emerald-50 text-emerald-600'],
];

export function categoryVisual(name = '') {
  for (const [re, Icon, cls] of MAP) if (re.test(name)) return { Icon, cls };
  return { Icon: Leaf, cls: 'bg-teal-50 text-teal-600' };
}
