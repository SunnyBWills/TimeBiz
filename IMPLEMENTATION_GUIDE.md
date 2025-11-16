# Time Visualization UI 改善実装ガイド

## 1. 必要な変更点のまとめ

### ① カテゴリーの横幅を合計時間の比率で可変化
- **変更前**: すべてのカテゴリー列が同じ幅（固定幅150-200px）
- **変更後**: 各カテゴリーの合計時間に基づいて横幅を動的に決定
  - 計算式: `widthRatio = (category_total_hours / all_categories_total_hours) * 100`
  - 最小幅: 120pxを確保（レイアウト崩れ防止）

### ② 各カテゴリーの縦方向も比率で高さを統一
- **変更前**: 各タスクボックスの高さが相対的に異なる
- **変更後**: 全カテゴリー列の高さを統一（500px）、その中でタスクを比率で積み上げ
  - 各カテゴリー列は1つの縦長矩形として統一
  - タスクの高さ = `(task_hours / category_total_hours) * container_height`
  - Treemap（縦方向のみ）に近い構造

### 技術スタック変更
- **変更前**: バニラJavaScript + カスタムCSS
- **変更後**: React + Tailwind CSS（CDN経由）

## 2. 修正後の完全なコンポーネント（React）

### ファイル: `static/heatmap.jsx`

```jsx
const { useState, useEffect } = React;

// カテゴリー別の色定義
const categoryColors = {
    'INVESTMENT': {
        bg: 'rgba(222, 246, 155, 0.3)',
        border: 'rgba(222, 246, 155, 0.6)',
        header: 'bg-green-200'
    },
    'WORK': {
        bg: 'rgba(248, 230, 130, 0.3)',
        border: 'rgba(248, 230, 130, 0.6)',
        header: 'bg-yellow-200'
    },
    'TECH': {
        bg: 'rgba(155, 200, 255, 0.3)',
        border: 'rgba(155, 200, 255, 0.6)',
        header: 'bg-blue-200'
    },
    'PERSONAL TASKS': {
        bg: 'rgba(255, 182, 193, 0.3)',
        border: 'rgba(255, 182, 193, 0.6)',
        header: 'bg-pink-200'
    },
    'EXERCISE': {
        bg: 'rgba(144, 238, 144, 0.3)',
        border: 'rgba(144, 238, 144, 0.6)',
        header: 'bg-green-300'
    },
    'OTHER': {
        bg: 'rgba(200, 200, 200, 0.3)',
        border: 'rgba(200, 200, 200, 0.6)',
        header: 'bg-gray-200'
    }
};

// カテゴリー列コンポーネント
function CategoryColumn({ category, tasks, totalHours, allCategoriesTotal, categoryColor, containerHeight = 500 }) {
    // 横幅の比率を計算
    const widthRatio = (totalHours / allCategoriesTotal) * 100;
    const minWidth = 120; // 最小幅120px
    
    // ヘッダーの高さを考慮（約80px）
    const headerHeight = 80;
    const tasksContainerHeight = containerHeight - headerHeight;
    
    return (
        <div
            className="category-column flex flex-col"
            style={{
                width: `max(${widthRatio}%, ${minWidth}px)`,
                minWidth: `${minWidth}px`,
                height: `${containerHeight}px`
            }}
        >
            {/* カテゴリーヘッダー */}
            <div className={`category-header ${categoryColor.header} p-4 text-center font-bold rounded-t-lg border mb-1`}>
                <div className="text-gray-800">{category}</div>
                <div className="text-sm text-gray-600 mt-1">合計: {totalHours.toFixed(2)}h</div>
            </div>
            
            {/* タスクリスト（縦方向にflexで積み上げ、高さを統一） */}
            <div 
                className="tasks-container flex flex-col flex-1"
                style={{ 
                    height: `${tasksContainerHeight}px`,
                    overflow: 'hidden'
                }}
            >
                {tasks.map((task, index) => {
                    // 各タスクの高さ比率を計算
                    const heightRatio = (task.hours / totalHours) * 100;
                    const taskHeight = (heightRatio / 100) * tasksContainerHeight;
                    
                    return (
                        <div
                            key={index}
                            className="task-card p-3 mb-1 rounded-lg border transition-all hover:translate-x-1 hover:shadow-md"
                            style={{
                                height: `${Math.max(taskHeight, 40)}px`,
                                minHeight: '40px',
                                backgroundColor: categoryColor.bg,
                                borderColor: categoryColor.border,
                                flexShrink: 0
                            }}
                        >
                            <div className="font-medium mb-1 text-gray-800">{task.taskName}</div>
                            <div className="text-sm text-gray-600">{task.hours.toFixed(2)}h</div>
                            <div className="text-xs text-gray-500 mt-1 font-medium">{heightRatio.toFixed(1)}%</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ヒートマップメインコンポーネント
function HeatmapVisualization({ data }) {
    if (!data || !data.rows || data.rows.length === 0) {
        return (
            <div className="empty-message text-center text-gray-500 py-20">
                データがありません
            </div>
        );
    }

    // カテゴリごとにデータをグループ化
    const categoryMap = {};
    data.rows.forEach(row => {
        if (!categoryMap[row.category]) {
            categoryMap[row.category] = [];
        }
        categoryMap[row.category].push({
            taskName: row.taskName,
            hours: row.hours
        });
    });

    // カテゴリごとの合計時間を計算
    const categoryTotals = {};
    Object.keys(categoryMap).forEach(category => {
        categoryTotals[category] = categoryMap[category].reduce((sum, task) => sum + task.hours, 0);
    });

    // 全カテゴリーの合計時間を計算
    const allCategoriesTotal = Object.values(categoryTotals).reduce((sum, total) => sum + total, 0);

    // カテゴリを合計時間の大きい順にソート（OTHERは最右に固定）
    const sortedCategories = Object.keys(categoryTotals)
        .filter(cat => cat !== 'OTHER')
        .sort((a, b) => categoryTotals[b] - categoryTotals[a]);
    
    // OTHERが存在する場合は最右に追加
    if (categoryTotals['OTHER'] && categoryTotals['OTHER'] > 0) {
        sortedCategories.push('OTHER');
    }

    // 各カテゴリーのタスクを時間数の大きい順にソート
    sortedCategories.forEach(category => {
        categoryMap[category].sort((a, b) => b.hours - a.hours);
    });

    // コンテナの高さを統一（500px）
    const containerHeight = 500;

    return (
        <div 
            className="heatmap-wrapper flex gap-5 items-stretch"
            style={{
                width: '100%',
                height: `${containerHeight}px`,
                overflowX: 'auto',
                overflowY: 'hidden'
            }}
        >
            {sortedCategories.map(category => (
                <CategoryColumn
                    key={category}
                    category={category}
                    tasks={categoryMap[category]}
                    totalHours={categoryTotals[category]}
                    allCategoriesTotal={allCategoriesTotal}
                    categoryColor={categoryColors[category] || categoryColors['OTHER']}
                    containerHeight={containerHeight}
                />
            ))}
        </div>
    );
}

// グローバルにHeatmapVisualizationを公開（既存のapp.jsから使用）
window.HeatmapVisualization = HeatmapVisualization;
```

## 3. 修正後のTailwind/CSS

### Tailwind CSS（CDN経由）
HTMLテンプレートに以下を追加済み:
```html
<script src="https://cdn.tailwindcss.com"></script>
```

### 既存CSS（`static/style.css`）は維持
既存のガラス風UIスタイルはそのまま使用。Tailwindと併用可能。

## 4. 比率計算のコード（JavaScript）

### 横幅比率の計算
```javascript
// 各カテゴリーの横幅比率
const widthRatio = (categoryTotalHours / allCategoriesTotalHours) * 100;

// 実際の幅（最小幅120pxを確保）
const actualWidth = `max(${widthRatio}%, 120px)`;
```

### 縦方向の高さ比率の計算
```javascript
// 各タスクの高さ比率
const heightRatio = (taskHours / categoryTotalHours) * 100;

// 実際の高さ（コンテナ高さ500px、ヘッダー80pxを考慮）
const tasksContainerHeight = 500 - 80; // 420px
const taskHeight = (heightRatio / 100) * tasksContainerHeight;
```

## 5. テストデータを用いたレンダリング例

### テストデータ例
```json
{
  "logDate": "2025-11-15",
  "rows": [
    { "category": "WORK", "taskName": "FRST", "hours": 611 },
    { "category": "OTHER", "taskName": "その他1", "hours": 3000 },
    { "category": "OTHER", "taskName": "その他2", "hours": 3271 },
    { "category": "INVESTMENT", "taskName": "AI ETF", "hours": 100 },
    { "category": "TECH", "taskName": "Crybotix3", "hours": 50 }
  ]
}
```

### 期待される結果
- **OTHER**: 6271h（最大）→ 最大幅の列
- **WORK**: 611h → 中程度の幅
- **INVESTMENT**: 100h → 小さい幅（最小120px）
- **TECH**: 50h → 小さい幅（最小120px）

各カテゴリー列の高さは統一（500px）、タスクは比率で積み上げ表示。

## 6. 既存コードの差し替え位置

### 変更ファイル一覧

1. **`templates/index.html`**
   - React/Tailwind/BabelのCDNを追加
   - `heatmap.jsx`の読み込みを追加

2. **`static/heatmap.jsx`**（新規作成）
   - Reactコンポーネントでヒートマップを実装
   - 横幅・縦方向の比率計算を実装

3. **`static/app.js`**
   - `renderHeatmap()`関数をReactコンポーネント使用に変更

### 統合方法
既存のFlaskバックエンドは変更不要。フロントエンドのみReact + Tailwindに移行。

## 7. 動作確認方法

1. Flaskアプリを起動: `python app.py`
2. ブラウザで `http://localhost:5000` にアクセス
3. 時間入力タブでデータを入力・保存
4. ヒートマップタブで可視化を確認
   - カテゴリーの横幅が合計時間に比例しているか
   - 各カテゴリー列の高さが統一されているか
   - タスクが比率で積み上げられているか


