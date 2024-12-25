import { Bookmark, CategoryResult } from '../models/types';
    
// Hilfsmethode zur Deduplizierung eines Bookmark-Arrays
export function deduplicateBookmarkArray(bookmarks: Bookmark[]): Bookmark[] {
    const bookmarkMap = new Map<string, Bookmark[]>();
    
    bookmarks.forEach(bookmark => {
        const existingGroup = bookmarkMap.get(bookmark.url) || [];
        existingGroup.push(bookmark);
        bookmarkMap.set(bookmark.url, existingGroup);
    });

    return Array.from(bookmarkMap.values()).map(group => {
        const newestBookmark = group.reduce((newest, current) => {
            const newestDate = newest.addDate ? new Date(parseInt(newest.addDate) * 1000) : new Date(0);
            const currentDate = current.addDate ? new Date(parseInt(current.addDate) * 1000) : new Date(0);
            return currentDate > newestDate ? current : newest;
        });
        
        // Kombiniere Tags von allen Duplikaten
        const allTags = new Set<string>();
        group.forEach(bookmark => {
            bookmark.tags.forEach(tag => allTags.add(tag));
        });
        newestBookmark.tags = Array.from(allTags);
        
        return newestBookmark;
    });
}

// Neue Hilfsmethode zum Formatieren der Bookmark-Zeilen
export function formatBookmarkLine(bookmark: Bookmark): string {
    const formatCell = (content: string): string => {
        if (!content) return '';
        return content
            .replace(/\|/g, '\\|')
            .replace(/\n/g, ' ')
            .trim();
    };

    const formattedTitle = formatCell(bookmark.title);
    const formattedUrl = `[🔗](${bookmark.url})`;
    const formattedTags = formatCell(bookmark.tags.join(' '));
    const formattedDate = formatCell(bookmark.addDate || '');
    const formattedDesc = formatCell(bookmark.description || '');
    const lastCheck = '';
    const status = '';

    return `| ${formattedTitle} | ${formattedUrl} | ${formattedTags} | ${formattedDate} | ${formattedDesc} | ${lastCheck} | ${status} |\n`;
}
	
export function categorize(title: string, href: string): CategoryResult {
    const lowerTitle = title.toLowerCase();
    const lowerUrl = href.toLowerCase();
    
    // Default category and subcategory
    let category = 'General';
    let subcategory = '';

    // Helper function to check keywords
    const matchesKeywords = (text: string, keywords: string[]): boolean => 
        keywords.some(keyword => text.includes(keyword));

    // Define category rules
    const categoryRules = [
        {
            category: 'News',
            keywords: ['news'],
            subcategories: {
                Technology: ['tech'],
                Business: ['business'],
                Sports: ['sports', 'sport'],
                Politics: ['politics', 'government']
            }
        },
        {
            category: 'Reference',
            keywords: ['wiki', 'wikipedia'],
            extractSubcategory: (lowerUrl: string) => {
                const match = lowerUrl.match(/wikipedia\.org\/wiki\/Category:(.+)/);
                return match ? match[1].replace(/_/g, ' ').split('/')[0] : '';
            }
        },
        {
            category: 'Blogs',
            keywords: ['blog'],
            subcategories: {
                Technology: ['tech', 'programming'],
                Business: ['business', 'economics'],
                Sports: ['sports', 'sport'],
                Politics: ['politics', 'government']
            }
        },
        {
            category: 'Social Media',
            keywords: ['social', 'media'],
            subcategories: {
                Social: ['social', 'community'],
                Media: ['media', 'news']
            }
        },
        {
            category: 'Travel',
            keywords: ['travel', 'tourism'],
            subcategories: {
                Food: ['food', 'recipes'],
                Travel: ['travel', 'tourism']
            }
        },
        {
            category: 'Entertainment',
            keywords: ['movies', 'music', 'games'],
            subcategories: {
                Movies: ['movies', 'films', 'cinema'],
                Music: ['music', 'songs'],
                Gaming: ['games', 'gaming']
            }
        },
        {
            category: 'Health & Wellness',
            keywords: ['health', 'wellness', 'fitness', 'medicine'],
            subcategories: {
                Fitness: ['fitness', 'exercise', 'workout'],
                Medicine: ['medicine', 'medical'],
                Nutrition: ['nutrition', 'diet']
            }
        },
        {
            category: 'Education',
            keywords: ['learn', 'education', 'tutorials'],
            subcategories: {
                Tutorials: ['tutorial', 'how-to'],
                Courses: ['course', 'class']
            }
        }
        // Add more categories and subcategories as needed
    ];

    // Check categories
    for (const rule of categoryRules) {
        if (matchesKeywords(lowerTitle, rule.keywords) || matchesKeywords(lowerUrl, rule.keywords)) {
            category = rule.category;

            // Check subcategories
            if (rule.subcategories) {
                for (const [subcat, subcatKeywords] of Object.entries(rule.subcategories)) {
                    if (matchesKeywords(lowerTitle, subcatKeywords) || matchesKeywords(lowerUrl, subcatKeywords)) {
                        subcategory = subcat;
                        break;
                    }
                }
            }

            // Extract subcategory if defined
            if (!subcategory && rule.extractSubcategory) {
                subcategory = rule.extractSubcategory(lowerUrl);
            }

            break;
        }
    }

    return { category, subcategory };
}