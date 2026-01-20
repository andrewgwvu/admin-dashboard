import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { accountService } from '../services/account.service';
import { AggregatedSearchResult } from '../types';

export default function AccountsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AggregatedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setError('');
    setLoading(true);
    setHasSearched(true);

    try {
      const searchResults = await accountService.searchAccounts(query);
      setResults(searchResults);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: AggregatedSearchResult) => {
    navigate(`/accounts/${encodeURIComponent(result.key)}`);
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'jumpcloud':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'okta':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case 'active-directory':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const sourceLabel = (source: string) => {
    switch (source) {
      case 'active-directory':
        return 'AD';
      case 'jumpcloud':
        return 'JumpCloud';
      case 'okta':
        return 'Okta';
      default:
        return source;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Management</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Search across JumpCloud, Okta, and Active Directory</p>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <form onSubmit={handleSearch}>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by name, email, username..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 dark:bg-red-900/30 p-4">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Each result may include matches from multiple directory sources.
            </p>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {results.map((result) => (
              <li
                key={result.key}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => handleResultClick(result)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{result.displayName}</p>

                      {result.sources.map((src) => (
                        <span
                          key={`${result.key}-${src}`}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSourceBadgeColor(
                            src
                          )}`}
                        >
                          {sourceLabel(src)}
                        </span>
                      ))}

                      {result.sources.length > 1 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                          {result.sources.length} sources
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      {result.email && <span>{result.email}</span>}
                      {result.username && <span>@{result.username}</span>}
                    </div>

                    <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Matches: {result.matches.length}
                    </div>
                  </div>
                  <div>
                    <svg
                      className="h-5 w-5 text-gray-400 dark:text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && results.length === 0 && hasSearched && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No results found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try searching with a different term</p>
        </div>
      )}
    </div>
  );
}
