import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rss, ArrowRight, Settings } from 'lucide-react';

interface RSSFeed {
  id: string;
  name: string;
  url: string;
}

export default function RSSWidget() {
  const [rssFeeds, setRssFeeds] = useState<RSSFeed[]>([]);

  useEffect(() => {
    const savedFeeds = localStorage.getItem('rss_feeds');
    if (savedFeeds) {
      setRssFeeds(JSON.parse(savedFeeds));
    }
  }, []);

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
        <Link
          to="/dashboard-settings"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Configure feeds"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>

      <div className="space-y-2">
        {rssFeeds.slice(0, 5).map((feed) => (
          <a
            key={feed.id}
            href={feed.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white">{feed.name}</span>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </a>
        ))}
      </div>

      {rssFeeds.length > 5 && (
        <Link
          to="/dashboard-settings"
          className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
        >
          View all {rssFeeds.length} feeds
          <ArrowRight className="h-3 w-3 ml-1" />
        </Link>
      )}
    </div>
  );
}
