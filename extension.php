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
        ];

        return $vars;
    }
}
