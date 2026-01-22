import { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2 } from 'lucide-react';

interface RSSFeed {
  id: string;
  name: string;
  url: string;
}

export default function DashboardSettingsPage() {
  const [logo, setLogo] = useState<string>(localStorage.getItem('dashboard_logo') || '');
  const [logoPreview, setLogoPreview] = useState<string>(localStorage.getItem('dashboard_logo') || '');
  const [rssFeeds, setRssFeeds] = useState<RSSFeed[]>([]);
  const [newFeed, setNewFeed] = useState({ name: '', url: '' });
  const [saveMessage, setSaveMessage] = useState<string>('');

  useEffect(() => {
    // Load RSS feeds from localStorage
    const savedFeeds = localStorage.getItem('rss_feeds');
    if (savedFeeds) {
      setRssFeeds(JSON.parse(savedFeeds));
    }
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = () => {
    if (logoPreview) {
      localStorage.setItem('dashboard_logo', logoPreview);
      setLogo(logoPreview);
      setSaveMessage('Logo saved! Please refresh the page to see changes.');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleRemoveLogo = () => {
    localStorage.removeItem('dashboard_logo');
    setLogo('');
    setLogoPreview('');
    setSaveMessage('Logo removed! Please refresh the page to see changes.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleAddFeed = () => {
    if (newFeed.name && newFeed.url) {
      const feed: RSSFeed = {
        id: Date.now().toString(),
        name: newFeed.name,
        url: newFeed.url,
      };
      const updatedFeeds = [...rssFeeds, feed];
      setRssFeeds(updatedFeeds);
      localStorage.setItem('rss_feeds', JSON.stringify(updatedFeeds));
      setNewFeed({ name: '', url: '' });
      setSaveMessage('RSS feed added successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleRemoveFeed = (id: string) => {
    const updatedFeeds = rssFeeds.filter((feed) => feed.id !== id);
    setRssFeeds(updatedFeeds);
    localStorage.setItem('rss_feeds', JSON.stringify(updatedFeeds));
    setSaveMessage('RSS feed removed successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 animate-slide-down">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Customize your dashboard appearance and RSS feeds
        </p>
      </div>

      {saveMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg">
          {saveMessage}
        </div>
      )}

      {/* Logo Configuration */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Dashboard Logo</h2>

        {logoPreview && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
            <img src={logoPreview} alt="Logo preview" className="h-16 w-auto" />
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Logo Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-blue-900/20 dark:file:text-blue-400
                dark:hover:file:bg-blue-900/30"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Recommended: PNG or SVG format, transparent background
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveLogo}
              disabled={!logoPreview}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Logo
            </button>
            {logo && (
              <button
                onClick={handleRemoveLogo}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center"
              >
                <X className="h-4 w-4 mr-2" />
                Remove Logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RSS Feed Configuration */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">RSS Feeds</h2>

        {/* Existing Feeds */}
        {rssFeeds.length > 0 && (
          <div className="mb-6 space-y-2">
            {rssFeeds.map((feed) => (
              <div
                key={feed.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{feed.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{feed.url}</div>
                </div>
                <button
                  onClick={() => handleRemoveFeed(feed.id)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Feed */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Feed Name
            </label>
            <input
              type="text"
              value={newFeed.name}
              onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
              placeholder="e.g., Tech News"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Feed URL
            </label>
            <input
              type="url"
              value={newFeed.url}
              onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
              placeholder="https://example.com/rss"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={handleAddFeed}
            disabled={!newFeed.name || !newFeed.url}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Feed
          </button>
        </div>
      </div>
    </div>
  );
}
