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
function CategoryColumn({ category, tasks, totalHours, allCategoriesTotal, categoryColor, containerWidth = 100, gapSize = 20, categoryCount = 1, headerHeight = HEADER_HEIGHT, taskAreaHeight = 600, taskHeights = [] }) {
    // 横幅の比率を計算（全カテゴリー合計に対する比率）
    const widthRatio = (totalHours / allCategoriesTotal) * 100;
    
    // 実際の幅を計算（親コンテナの幅からgapの合計を引いた幅に対する比率）
    const totalGapWidth = gapSize * (categoryCount - 1);
    const availableWidth = containerWidth - totalGapWidth;
    // 時間数の比率に基づいて幅を計算（最小幅の制約なし）
    const actualWidth = (widthRatio / 100) * availableWidth;
    
    // 列全体の高さを固定（ヘッダー + タスクエリア）
    const columnHeight = headerHeight + taskAreaHeight;
    
    return (
        <div
            className="category-column flex flex-col"
            style={{
                width: `${actualWidth}px`,
                flexBasis: `${actualWidth}px`,   
                height: `${columnHeight}px`,
                flexShrink: 0,
                flexGrow: 0
            }}
        >
            {/* カテゴリーヘッダー（固定高さ） */}
            <div className={`category-header ${categoryColor.header} text-center font-bold rounded-t-lg border mb-1`} style={{
                padding: '16px 12px',
                height: `${headerHeight}px`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flexShrink: 0
            }}>
                <div className="text-gray-800" style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '25px',
                    lineHeight: '1.5'
                }}>{category}</div>
                <div className="text-gray-700 font-semibold" style={{
                    fontSize: '20px',
                    lineHeight: '1.6'
                }}>{`${totalHours.toFixed(1)}h (${((totalHours / allCategoriesTotal) * 100).toFixed(1)}%), ${((totalHours / 8016) * 100).toFixed(1)}%`}</div>
            </div>
            
            {/* タスクリスト（固定高さのコンテナ内に配置） */}
            <div 
                className="tasks-container flex flex-col"
                style={{ 
                    height: `${taskAreaHeight}px`,
                    overflow: 'hidden',
                    gap: '4px'
                }}
            >
                {tasks.map((task, index) => {
                    // 表示する比率は全カテゴリー合計に対する比率
                    const globalRatio = (task.hours / allCategoriesTotal) * 100;

                    // 計算済みの高さを使用（taskHeights配列から取得）
                    const taskHeight = taskHeights[index] || MIN_TASK_HEIGHT;

                    const taskLabel = `${task.taskName}: ${task.hours.toFixed(1)}h (${globalRatio.toFixed(1)}%), ${((task.hours / 8016) * 100).toFixed(1)}%`;

                    return (
                        <div
                            key={index}
                            className="task-card rounded-lg border transition-all hover:translate-x-1 hover:shadow-md"
                            style={{
                                height: `${taskHeight}px`,
                                padding: '10px 12px',
                                boxSizing: 'border-box',
                                backgroundColor: categoryColor.bg,
                                borderColor: categoryColor.border,
                                flexShrink: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: '2px',
                                overflow: 'hidden'
                            }}
                        >
                            <div className="font-medium text-gray-800" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '20px', lineHeight: '1.4' }}>{taskLabel}</div>
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
        // 【レイアウト定数】全列で共通の高さを定義
        const HEADER_HEIGHT = 110;   // カテゴリヘッダーの高さ（固定）
        const MIN_TASK_HEIGHT = 48;   // タスクカードの最小高さ（上下の余白を含めてテキストが収まるように調整）
        const TASK_GAP = 4;           // タスク間のgap（px）
    

    const [layout, setLayout] = React.useState({
        containerWidth: window.innerWidth,
        taskAreaHeight: Math.max(window.innerHeight - HEADER_HEIGHT - 220, 320)
    });

    const wrapperRef = React.useRef(null);

    React.useEffect(() => {
        const updateLayout = () => {
            const fallbackTaskHeight = Math.max(window.innerHeight - HEADER_HEIGHT - 220, 320);

            if (wrapperRef.current) {
                const rect = wrapperRef.current.getBoundingClientRect();
                const availableHeight = Math.max(window.innerHeight - rect.top - 24, 320);
                setLayout({
                    containerWidth: rect.width,
                    taskAreaHeight: Math.max(availableHeight - HEADER_HEIGHT, 220)
                });
            } else {
                setLayout(prev => ({
                    ...prev,
                    containerWidth: window.innerWidth,
                    taskAreaHeight: fallbackTaskHeight
                }));
            }
        };

        updateLayout();
        window.addEventListener('resize', updateLayout);
        return () => window.removeEventListener('resize', updateLayout);
    }, [data]);

    const TASK_AREA_HEIGHT = layout.taskAreaHeight;

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
    // OTHERカテゴリーを検索（大文字小文字を区別しない）
    const otherCategory = Object.keys(categoryTotals).find(cat => 
        cat === 'OTHER' || cat.toUpperCase() === 'OTHER' || cat.includes('OTHER')
    );
    
    // OTHER以外のカテゴリーをソート
    const sortedCategories = Object.keys(categoryTotals)
        .filter(cat => {
            const catUpper = cat.toUpperCase();
            return catUpper !== 'OTHER' && !catUpper.includes('OTHER');
        })
        .sort((a, b) => categoryTotals[b] - categoryTotals[a]);
    
    // OTHERが存在する場合は最右に追加（時間数に関係なく表示）
    if (otherCategory) {
        sortedCategories.push(otherCategory);
    }

    // 各カテゴリーのタスクを時間数の大きい順にソート
    sortedCategories.forEach(category => {
        categoryMap[category].sort((a, b) => b.hours - a.hours);
    });

    // 【各カテゴリのタスク高さを計算】全列で同じTASK_AREA_HEIGHTに揃える
    const categoryTaskHeights = {};
    sortedCategories.forEach(category => {
        const tasks = categoryMap[category];
        const totalCategoryHours = categoryTotals[category];
        
        if (tasks.length === 0) {
            categoryTaskHeights[category] = [];
            return;
        }
        
        // 1. 各タスクの理想の高さを計算（時間比率に基づく）
        const rawHeights = tasks.map(task => {
            const ratio = totalCategoryHours > 0 ? (task.hours / totalCategoryHours) : 0;
            return ratio * TASK_AREA_HEIGHT;
        });
        
        // 2. 最小高さを適用
        const heightsWithMin = rawHeights.map(h => Math.max(h, MIN_TASK_HEIGHT));
        
        // 3. gapを考慮した利用可能な高さを計算
        const totalGapHeight = TASK_GAP * (tasks.length - 1);
        const availableHeight = TASK_AREA_HEIGHT - totalGapHeight;
        
        // 4. 合計がavailableHeightになるように正規化
        const currentSum = heightsWithMin.reduce((sum, h) => sum + h, 0);
        const scale = currentSum > 0 ? availableHeight / currentSum : 1;
        let finalHeights = heightsWithMin.map(h => h * scale);
        
        // 5. 最小高さを再度チェックし、必要に応じて再調整
        const needsAdjustment = finalHeights.some(h => h < MIN_TASK_HEIGHT);
        if (needsAdjustment) {
            // 最小高さ未満のタスクを修正
            finalHeights = finalHeights.map(h => Math.max(h, MIN_TASK_HEIGHT));
            const adjustedSum = finalHeights.reduce((sum, h) => sum + h, 0);
            if (adjustedSum > availableHeight) {
                // 再度スケール調整
                const finalScale = availableHeight / adjustedSum;
                finalHeights = finalHeights.map(h => h * finalScale);
            }
        }
        
        // 6. 小数点を丸めて整数化
        categoryTaskHeights[category] = finalHeights.map(h => Math.round(h));
        
        // 7. 最終チェック：合計がTASK_AREA_HEIGHT（gap含む）に近づくように微調整
        const finalSum = categoryTaskHeights[category].reduce((sum, h) => sum + h, 0) + totalGapHeight;
        const diff = TASK_AREA_HEIGHT - finalSum;
        if (Math.abs(diff) > 0.5 && categoryTaskHeights[category].length > 0) {
            // 最大のタスクに差分を加算（または減算）
            const maxIndex = categoryTaskHeights[category].indexOf(
                Math.max(...categoryTaskHeights[category])
            );
            categoryTaskHeights[category][maxIndex] += Math.round(diff);
        }
    });
    
    return (
        <div
            className="heatmap-wrapper flex items-stretch"
            ref={wrapperRef}
            style={{
                width: '100%',
                height: `${HEADER_HEIGHT + TASK_AREA_HEIGHT}px`,
                overflowX: 'auto',
                overflowY: 'visible'
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
                    containerWidth={layout.containerWidth}
                    gapSize={5}
                    categoryCount={sortedCategories.length}
                    headerHeight={HEADER_HEIGHT}
                    taskAreaHeight={TASK_AREA_HEIGHT}
                    taskHeights={categoryTaskHeights[category] || []}
                />
            ))}
        </div>
    );
}

// グローバルにHeatmapVisualizationを公開（既存のapp.jsから使用）
window.HeatmapVisualization = HeatmapVisualization;

