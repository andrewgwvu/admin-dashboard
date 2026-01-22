export interface RSSFeed {
  id: string;
  name: string;
  url: string;
}

export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  creator?: string;
  guid?: string;
}

export interface ParsedRSSFeed {
  feedId: string;
  feedName: string;
  items: RSSItem[];
}
