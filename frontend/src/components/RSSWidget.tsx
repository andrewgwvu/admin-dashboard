import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rss, Settings, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { rssService } from '../services/rss.service';
import type { RSSFeed, ParsedRSSFeed, RSSItem } from '../types/rss';

export default function RSSWidget() {
  const [rssFeeds, setRssFeeds] = useState<RSSFeed[]>([]);
  const [parsedFeeds, setParsedFeeds] = useState<ParsedRSSFeed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedFeeds = localStorage.getItem('rss_feeds');
    if (savedFeeds) {
      const feeds = JSON.parse(savedFeeds);
      setRssFeeds(feeds);
      fetchFeeds(feeds);
    }
  }, []);

  const fetchFeeds = async (feeds: RSSFeed[]) => {
    if (feeds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const results = await rssService.fetchAllFeeds(feeds);
      setParsedFeeds(results);
    } catch (err) {
      setError('Failed to load RSS feeds');
      console.error('RSS fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchFeeds(rssFeeds);
  };

  // Combine all items from all feeds and sort by date
  const allItems: (RSSItem & { feedName: string; feedId: string })[] = [];
  parsedFeeds.forEach((feed) => {
    feed.items.forEach((item) => {
      allItems.push({
        ...item,
        feedName: feed.feedName,
        feedId: feed.feedId,
      });
    });
  });

  allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  if (rssFeeds.length === 0) {
    return (
      <Link
        to="/dashboard-settings"
        className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg hover:scale-105 transition-all duration-200 block"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Rss className="h-8 w-8 text-orange-600 dark:text-orange-400 mr-4" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">RSS Feeds</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure your feeds</p>
            </div>
          </div>
          <Settings className="h-5 w-5 text-gray-400" />
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Rss className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">RSS Feeds</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            title="Refresh feeds"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/dashboard-settings"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Configure feeds"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center text-red-800 dark:text-red-300">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {loading && allItems.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : allItems.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {allItems.slice(0, 10).map((item, index) => (
            <a
              key={`${item.feedId}-${item.guid || index}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                      {item.feedName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {rssService.formatDate(item.pubDate)}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {rssService.truncate(item.description, 120)}
                    </p>
                  )}
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0" />
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <Rss className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No feed items available</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {allItems.length > 10 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Showing 10 of {allItems.length} items
          </p>
        </div>
      )}
    </div>
  );
}
