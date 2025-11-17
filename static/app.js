const HOURS_PER_YEAR = 8760;

// タブ切り替え機能
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const heatmapTabButton = document.querySelector('[data-tab="heatmap"]');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // タブボタンのアクティブ状態を更新
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // タブコンテンツの表示を切り替え
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });

    // 保存ボタンのイベント
    document.getElementById('save-button').addEventListener('click', handleSave);

    // ヒートマップタブ表示時にも最新データを読み込む
    heatmapTabButton.addEventListener('click', handleLoad);

    // 初期表示時にヒートマップを読み込む
    handleLoad();
});

// テキストをパースする関数
function parseTimeInput(text) {
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        return { rows: [], errors: ['データが空です'] };
    }

    // 1行目はヘッダーとしてスキップ
    const dataLines = lines.slice(1);
    
    const rows = [];
    const errors = [];
    const allowedCategories = ['INVESTMENT', 'WORK', 'TECH', 'PERSONAL TASKS', 'EXERCISE', 'OTHER'];

    dataLines.forEach((line, index) => {
        const lineNumber = index + 2; // ヘッダー行を考慮して+2
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
            return; // 空行はスキップ
        }

        // 区切り文字の判定
        let columns;
        if (trimmedLine.includes('\t')) {
            // TSV
            columns = trimmedLine.split('\t').map(col => col.trim());
        } else if (trimmedLine.includes(',')) {
            // CSV
            columns = trimmedLine.split(',').map(col => col.trim());
        } else {
            // 複数スペースで区切る
            columns = trimmedLine.split(/\s+/).filter(col => col.trim());
        }

        // カラム数チェック
        if (columns.length < 3) {
            errors.push(`行${lineNumber}: カラム数が不足しています（3列必要です）`);
            return;
        }

        const category = columns[0].trim();
        const taskName = columns[1].trim();
        const hoursStr = columns[2].trim();

        // カテゴリチェック
        if (!allowedCategories.includes(category)) {
            errors.push(`行${lineNumber}: カテゴリ "${category}" は許可されていません（許可: ${allowedCategories.join(', ')}）`);
            return;
        }

        // タスク名チェック
        if (!taskName) {
            errors.push(`行${lineNumber}: タスク名が空です`);
            return;
        }

        // 時間数チェック
        const hours = parseFloat(hoursStr);
        if (isNaN(hours) || hours <= 0) {
            errors.push(`行${lineNumber}: 時間数 "${hoursStr}" は0より大きい数値である必要があります`);
            return;
        }

        rows.push({
            category: category,
            taskName: taskName,
            hours: hours
        });
    });

    return { rows, errors };
}

function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

function calculateTotalHours(rows = []) {
    return rows.reduce((sum, row) => sum + (parseFloat(row.hours) || 0), 0);
}

function updateHeatmapSummary(rows = [], statusMessage) {
    const summaryElement = document.getElementById('heatmap-summary');
    if (!summaryElement) return;

    if (statusMessage) {
        summaryElement.textContent = statusMessage;
        return;
    }

    const totalHours = calculateTotalHours(rows);
    const yearRatio = totalHours > 0 ? (totalHours / HOURS_PER_YEAR) * 100 : 0;
    summaryElement.textContent = `年間換算: ${yearRatio.toFixed(1)}% (総計 ${totalHours.toFixed(1)}h)`;
}

// 保存処理
async function handleSave() {
    const logDate = getTodayDateString();
    const timeInput = document.getElementById('time-input').value;
    const messageArea = document.getElementById('message-area');
    const errorList = document.getElementById('error-list');

    // メッセージエリアをリセット
    messageArea.className = 'message-area';
    messageArea.textContent = '';
    errorList.classList.remove('show');
    errorList.innerHTML = '';

    // 入力テキストのパース
    const parseResult = parseTimeInput(timeInput);
    
    if (parseResult.errors.length > 0) {
        showErrors(parseResult.errors);
        return;
    }

    if (parseResult.rows.length === 0) {
        showError('有効なデータ行がありません');
        return;
    }

    // APIに送信
    try {
        const response = await fetch('/api/time-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                logDate: logDate,
                rows: parseResult.rows
            })
        });

        const data = await response.json();

        if (response.ok && data.status === 'ok') {
            showSuccess(`保存成功: ${data.savedCount}件の時間ログを保存しました`);
            
            // テキストエリアをクリア
            document.getElementById('time-input').value = '';
            
            // ヒートマップタブに切り替えてデータを再読み込み
            document.querySelector('[data-tab="heatmap"]').click();
            await handleLoad();
        } else {
            if (data.errors && Array.isArray(data.errors)) {
                showErrors(data.errors);
            } else {
                showError(data.message || '保存に失敗しました');
            }
        }
    } catch (error) {
        showError(`エラーが発生しました: ${error.message}`);
    }
}

// ヒートマップ読み込み処理
async function handleLoad() {
    const logDate = getTodayDateString();
    const heatmapRoot = document.getElementById('heatmap-root');

    try {
        const response = await fetch(`/api/time-logs?date=${logDate}`);
        const data = await response.json();

        if (response.ok) {
            updateHeatmapSummary(data.rows || []);

            // ヒートマップをリセット（完全にクリア）
            heatmapRoot.innerHTML = '';

            if (data.rows && data.rows.length > 0) {
                renderHeatmap(data);
            } else {
                heatmapRoot.innerHTML = '<p class="empty-message">本日のデータはまだ登録されていません</p>';
            }
        } else {
            updateHeatmapSummary([], '年間換算: データ取得エラー');
            heatmapRoot.innerHTML = `<p class="empty-message">エラー: ${data.message || 'データの取得に失敗しました'}</p>`;
        }
    } catch (error) {
        updateHeatmapSummary([], '年間換算: データ取得エラー');
        heatmapRoot.innerHTML = `<p class="empty-message">エラーが発生しました: ${error.message}</p>`;
    }
}

// ヒートマップ描画（Reactコンポーネントを使用）
function renderHeatmap(data) {
    const heatmapRoot = document.getElementById('heatmap-root');
    
    // 既存の内容を完全にリセット
    heatmapRoot.innerHTML = '';
    
    // Reactコンポーネントをレンダリング
    if (window.HeatmapVisualization && React && ReactDOM) {
        const root = ReactDOM.createRoot(heatmapRoot);
        root.render(React.createElement(window.HeatmapVisualization, { data: data }));
    } else {
        // Reactが読み込まれていない場合のフォールバック
        heatmapRoot.innerHTML = '<p class="empty-message">Reactコンポーネントが読み込まれていません</p>';
    }
}

// メッセージ表示関数
function showSuccess(message) {
    const messageArea = document.getElementById('message-area');
    messageArea.className = 'message-area success';
    messageArea.textContent = message;
    
    setTimeout(() => {
        messageArea.className = 'message-area';
        messageArea.textContent = '';
    }, 5000);
}

function showError(message) {
    const messageArea = document.getElementById('message-area');
    messageArea.className = 'message-area error';
    messageArea.textContent = message;
}

function showErrors(errors) {
    const errorList = document.getElementById('error-list');
    errorList.classList.add('show');
    
    const ul = document.createElement('ul');
    errors.forEach(error => {
        const li = document.createElement('li');
        li.textContent = error;
        ul.appendChild(li);
    });
    
    errorList.innerHTML = '';
    errorList.appendChild(ul);
}

