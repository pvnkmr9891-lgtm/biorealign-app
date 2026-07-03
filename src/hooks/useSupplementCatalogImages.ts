import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const BUCKET = 'supplement-images';
const CATALOG_KEY = ['supplement', 'catalog_images'];

// ── Fetch the full supplement_id → image_url map ────────────────────────
// Shared by both the admin upload screen and the client/coach grid views.
export function useSupplementCatalogImages() {
  return useQuery({
    queryKey: CATALOG_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('supplement_catalog_images').select('supplement_id, image_url');
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.supplement_id] = row.image_url;
      return map;
    },
  });
}

// ── Admin: upload/replace a catalog photo ───────────────────────────────
// Resizes to a max 600x600 box and re-encodes as ~70%-quality JPEG before
// upload, so the bucket never accumulates full-resolution phone photos for
// what's ultimately a small square thumbnail in the app.
export function useUploadSupplementCatalogImage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplementId, uri }: { supplementId: string; uri: string }) => {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 600, height: 600 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const path = `${supplementId}.jpg`;
      const formData = new FormData();
      formData.append('file', { uri: manipulated.uri, name: `${supplementId}.jpg`, type: 'image/jpeg' } as any);

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'x-upsert': 'true' },
        body: formData,
      });
      if (!uploadResponse.ok) throw new Error(`Upload failed: ${await uploadResponse.text()}`);

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      // Cache-bust so the client grid picks up a replaced photo immediately
      // instead of an old cached image at the same URL.
      const imageUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      const { error: dbError } = await supabase
        .from('supplement_catalog_images')
        .upsert({ supplement_id: supplementId, image_url: imageUrl, uploaded_by: user!.id, updated_at: new Date().toISOString() });
      if (dbError) throw dbError;

      return imageUrl;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATALOG_KEY }),
  });
}

// ── Admin: remove a catalog photo (falls back to the icon placeholder) ──
export function useDeleteSupplementCatalogImage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (supplementId: string) => {
      await supabase.storage.from(BUCKET).remove([`${supplementId}.jpg`]);
      const { error } = await supabase.from('supplement_catalog_images').delete().eq('supplement_id', supplementId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATALOG_KEY }),
  });
}
