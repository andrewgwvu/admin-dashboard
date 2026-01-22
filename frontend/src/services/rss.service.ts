import axios from 'axios';
import type { RSSItem, RSSFeed, ParsedRSSFeed } from '../types/rss';

// Using rss2json as a CORS proxy and RSS parser
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json';

export const rssService = {
  async fetchFeed(feed: RSSFeed): Promise<ParsedRSSFeed> {
    try {
      const response = await axios.get(RSS2JSON_API, {
        params: {
          rss_url: feed.url,
          api_key: '', // Free tier works without API key, but has rate limits
          count: 10, // Number of items to fetch
        },
      });

      if (response.data.status !== 'ok') {
        throw new Error(response.data.message || 'Failed to fetch feed');
      }

      const items: RSSItem[] = response.data.items.map((item: any) => ({
        title: item.title,
        link: item.link,
        description: this.stripHtml(item.description || item.content || ''),
        pubDate: item.pubDate,
        creator: item.author || undefined,
        guid: item.guid || item.link,
      }));

      return {
        feedId: feed.id,
        feedName: feed.name,
        items,
      };
    } catch (error) {
      console.error(`Failed to fetch RSS feed ${feed.name}:`, error);
      throw error;
    }
  },

  async fetchAllFeeds(feeds: RSSFeed[]): Promise<ParsedRSSFeed[]> {
    const results = await Promise.allSettled(
      feeds.map((feed) => this.fetchFeed(feed))
    );

    return results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<ParsedRSSFeed>).value);
  },

  stripHtml(html: string): string {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  },

  truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  },

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  },
};
