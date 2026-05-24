'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, RefreshCw, ArrowRight, User } from 'lucide-react';
import type { CharacterInfo } from '@/types';

interface CharacterStepProps {
  character: CharacterInfo | null;
  onConfirm: (character: CharacterInfo) => void;
}

const fields: { key: keyof CharacterInfo; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'hairColor', label: 'Hair Color' },
  { key: 'eyeColor', label: 'Eye Color' },
  { key: 'skinTone', label: 'Skin Tone' },
  { key: 'hairstyle', label: 'Hairstyle' },
  { key: 'height', label: 'Height' },
  { key: 'build', label: 'Build' },
  { key: 'distinctiveFeatures', label: 'Distinctive Features' },
];

export default function CharacterStep({ character, onConfirm }: CharacterStepProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editData, setEditData] = useState<CharacterInfo | null>(character);

  const handleSearch = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setEditData(data);
    } catch (e) {
      setError('Search failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof CharacterInfo, value: string) => {
    if (!editData) return;
    setEditData({ ...editData, [key]: value });
  };

  return (
    <Card className='w-full max-w-2xl mx-auto'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <User className='w-5 h-5 text-primary' />
          Step 1: Character Search
        </CardTitle>
        <CardDescription>Enter a character name to search for appearance details</CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        <div className='flex gap-2'>
          <Input
            placeholder='Enter character name...'
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className='flex-1'
          />
          <Button onClick={handleSearch} disabled={loading || !name.trim()}>
            {loading ? <RefreshCw className='w-4 h-4 animate-spin' /> : <Search className='w-4 h-4' />}
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {error && <p className='text-sm text-destructive'>{error}</p>}

        {loading && !editData && (
          <div className='space-y-4'>
            {fields.map((f) => (
              <div key={f.key} className='space-y-2'>
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-10 w-full' />
              </div>
            ))}
          </div>
        )}

        {editData && (
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-medium text-muted-foreground'>Character Details</h3>
              <Button variant='ghost' size='sm' onClick={handleSearch} disabled={loading}>
                <RefreshCw className={'w-3 h-3 mr-1 ' + (loading ? 'animate-spin' : '')} />
                Re-search
              </Button>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              {fields.map((f) => (
                <div key={f.key} className='space-y-1.5'>
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    value={editData[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    placeholder={'Enter ' + f.label.toLowerCase()}
                  />
                </div>
              ))}
            </div>
            <Button onClick={() => onConfirm(editData)} className='w-full'>
              Confirm & Continue
              <ArrowRight className='w-4 h-4 ml-2' />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}