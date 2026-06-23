export type FavoriteItemType = 'aula' | 'ruta' | 'ubicacion';

export interface Favorite {
  id: string;
  itemId: string;
  itemType: FavoriteItemType;
  itemName: string;
  itemData: Record<string, unknown>;
  createdAt: string;
}

export interface CreateFavoriteInput {
  itemId: string;
  itemType: FavoriteItemType;
  itemName: string;
  itemData: Record<string, unknown>;
}
