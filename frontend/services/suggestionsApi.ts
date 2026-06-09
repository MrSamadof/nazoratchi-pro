import { baseApi } from './baseApi';
import type { Division, SuggestionStatus } from '@/shared/types';

export interface ApiSuggestion {
  id: string;
  title: string;
  text: string;
  isAnonymous: boolean;
  authorName: string | null;
  storeName: string | null;
  division: Division | null;
  status: SuggestionStatus;
  ceoResponse: string;
  decidedAt: string | null;
  createdAt: string;
}

export interface CreateSuggestionBody {
  title?: string;
  text: string;
  isAnonymous?: boolean;
}

export const suggestionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // CEO — barcha takliflar.
    listSuggestions: build.query<ApiSuggestion[], { status?: SuggestionStatus } | void>({
      query: (arg) => (arg?.status ? `/suggestions?status=${arg.status}` : '/suggestions'),
      transformResponse: (res: { ok: boolean; suggestions: ApiSuggestion[] }) =>
        res.suggestions ?? [],
      providesTags: [{ type: 'Suggestion', id: 'LIST' }],
    }),

    // Xodim — o'z takliflari.
    listMySuggestions: build.query<ApiSuggestion[], void>({
      query: () => '/suggestions/mine',
      transformResponse: (res: { ok: boolean; suggestions: ApiSuggestion[] }) =>
        res.suggestions ?? [],
      providesTags: [{ type: 'Suggestion', id: 'MINE' }],
    }),

    // CEO — ko'rilmagan (new) takliflar soni (sidebar rozetkasi).
    getNewSuggestionCount: build.query<number, void>({
      query: () => '/suggestions/count-new',
      transformResponse: (res: { ok: boolean; count: number }) => res.count ?? 0,
      providesTags: [{ type: 'Suggestion', id: 'COUNT' }],
    }),

    createSuggestion: build.mutation<{ ok: boolean; error?: string }, CreateSuggestionBody>({
      query: (body) => ({ url: '/suggestions', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Suggestion', id: 'LIST' },
        { type: 'Suggestion', id: 'MINE' },
        { type: 'Suggestion', id: 'COUNT' },
      ],
    }),

    decideSuggestion: build.mutation<
      { ok: boolean; error?: string },
      { id: string; status: SuggestionStatus; response?: string }
    >({
      query: ({ id, status, response }) => ({
        url: `/suggestions/${id}/decide`,
        method: 'POST',
        body: { status, response },
      }),
      invalidatesTags: [
        { type: 'Suggestion', id: 'LIST' },
        { type: 'Suggestion', id: 'MINE' },
        { type: 'Suggestion', id: 'COUNT' },
      ],
    }),
  }),
});

export const {
  useListSuggestionsQuery,
  useListMySuggestionsQuery,
  useGetNewSuggestionCountQuery,
  useCreateSuggestionMutation,
  useDecideSuggestionMutation,
} = suggestionsApi;
