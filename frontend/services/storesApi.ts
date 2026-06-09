import { baseApi } from './baseApi';

export interface ApiStoreLite {
  id: string;
  name: string;
  slug?: string;
}

export const storesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listStores: build.query<ApiStoreLite[], void>({
      query: () => '/stores',
      transformResponse: (res: { ok?: boolean; stores: ApiStoreLite[] }) => res.stores ?? [],
      providesTags: [{ type: 'Store', id: 'LIST' }],
    }),
  }),
});

export const { useListStoresQuery } = storesApi;
