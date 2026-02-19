<?php
declare(strict_types=1);

final class FilterBuilderExtension extends Minz_Extension {
    public function init(): void {
        parent::init();
        $this->registerTranslates();
        Minz_View::appendStyle($this->getFileUrl('filter-builder.css'));
        Minz_View::appendScript($this->getFileUrl('filter-builder.js'));

        $this->registerHook('js_vars', [$this, 'injectData']);
    }

    /**
     * @param array<string,mixed> $vars
     * @return array<string,mixed>
     */
    public function injectData(array $vars): array {
        $feeds = [];
        $categories = [];
        $labels = [];
        $userQueries = [];
        $locale = class_exists('Minz_Translate') ? Minz_Translate::language() : 'en';

        try {
            foreach (FreshRSS_Context::categories() as $category) {
                $categories[] = [
                    'id' => $category->id(),
                    'name' => $category->name(),
                ];
                foreach ($category->feeds() as $feed) {
                    $feeds[] = [
                        'id' => $feed->id(),
                        'name' => $feed->name(),
                    ];
                }
            }

            foreach (FreshRSS_Context::labels() as $label) {
                $labels[] = [
                    'id' => $label->id(),
                    'name' => $label->name(),
                ];
            }

            $queries = FreshRSS_Context::userConf()->queries ?? [];
            foreach ($queries as $i => $query) {
                $userQueries[] = [
                    'id' => $i,
                    'name' => $query['name'] ?? ('Query ' . ($i + 1)),
                ];
            }
        } catch (\Throwable $e) {
            // Gracefully handle missing context (e.g. during install)
        }

        $vars['filterBuilder'] = [
            'feeds' => $feeds,
            'categories' => $categories,
            'labels' => $labels,
            'userQueries' => $userQueries,
            'locale' => $locale,
            'i18n' => self::translationsForLocale($locale),
        ];

        return $vars;
    }

    private static function translationsForLocale(string $locale): array {
        $isZh = str_starts_with(strtolower($locale), 'zh');

        if ($isZh) {
            return [
                'toggle_btn' => '构建查询',
                'panel_title' => '查询构建器',
                'add_condition' => '添加条件',
                'add_or_group' => '添加 OR 组',
                'preview_empty' => '暂无条件',
                'fill_search' => '写入搜索框',
                'search_now' => '立即搜索',
                'load_from_search' => '加载当前搜索',
                'group_and' => 'AND（全部匹配）',
                'operator_intitle' => '标题',
                'operator_intext' => '正文',
                'operator_inurl' => '链接',
                'operator_author' => '作者',
                'operator_tag' => '标签',
                'operator_free' => '自由文本',
                'operator_f' => '订阅源',
                'operator_c' => '分类',
                'operator_L' => '标签ID',
                'operator_label' => '标签名',
                'operator_e' => '条目ID',
                'operator_date' => '日期',
                'operator_pubdate' => '发布日期',
                'operator_userdate' => '用户日期',
                'operator_S' => '已保存搜索',
            ];
        }

        return [
            'toggle_btn' => 'Build query',
            'panel_title' => 'Query Builder',
            'add_condition' => 'Add condition',
            'add_or_group' => 'Add OR group',
            'preview_empty' => 'No conditions yet',
            'fill_search' => 'Copy to search box',
            'search_now' => 'Run search',
            'load_from_search' => 'Load current search',
            'group_and' => 'AND (all must match)',
            'operator_intitle' => 'Title',
            'operator_intext' => 'Body text',
            'operator_inurl' => 'URL',
            'operator_author' => 'Author',
            'operator_tag' => 'Tag',
            'operator_free' => 'Free text',
            'operator_f' => 'Feed',
            'operator_c' => 'Category',
            'operator_L' => 'Label ID',
            'operator_label' => 'Label',
            'operator_e' => 'Entry ID',
            'operator_date' => 'Date',
            'operator_pubdate' => 'Publish date',
            'operator_userdate' => 'User date',
            'operator_S' => 'Saved query',
        ];
    }
}
