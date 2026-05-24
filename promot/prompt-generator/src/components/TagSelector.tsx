'use client';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface TagSelectorProps {
  label: string;
  tags: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function TagSelector({ label, tags, value, onChange }: TagSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const selected = value === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(selected ? '' : tag)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full border transition-all',
                selected
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-muted bg-background hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
