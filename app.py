from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
from decimal import Decimal
import re
from sqlalchemy import and_

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///time_logs.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 許可されたカテゴリ
ALLOWED_CATEGORIES = ['INVESTMENT', 'WORK', 'TECH', 'PERSONAL TASKS', 'EXERCISE', 'OTHER']


class TimeLog(db.Model):
    __tablename__ = 'time_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, default=1)
    log_date = db.Column(db.Date, nullable=False)
    category = db.Column(db.String(32), nullable=False)
    task_name = db.Column(db.String(255), nullable=False)
    hours = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('log_date', 'user_id', 'category', 'task_name', name='uq_time_log'),
    )


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/time-logs', methods=['POST'])
def save_time_logs():
    try:
        data = request.get_json()
        
        # バリデーション
        if not data:
            return jsonify({'status': 'error', 'message': 'リクエストボディが空です'}), 400
        
        log_date_str = data.get('logDate')
        if not log_date_str:
            return jsonify({'status': 'error', 'message': 'logDateが指定されていません'}), 400
        
        # 日付形式チェック
        try:
            log_date = datetime.strptime(log_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'status': 'error', 'message': 'logDateの形式が不正です（YYYY-MM-DD形式で指定してください）'}), 400
        
        rows = data.get('rows', [])
        if not rows or len(rows) == 0:
            return jsonify({'status': 'error', 'message': 'rowsが空です'}), 400
        
        # 各行のバリデーション
        errors = []
        validated_rows = []
        
        for idx, row in enumerate(rows, start=1):
            category = row.get('category', '').strip()
            task_name = row.get('taskName', '').strip()
            hours = row.get('hours')
            
            # カテゴリチェック
            if category not in ALLOWED_CATEGORIES:
                errors.append(f'行{idx}: カテゴリ "{category}" は許可されていません')
                continue
            
            # タスク名チェック
            if not task_name:
                errors.append(f'行{idx}: タスク名が空です')
                continue
            
            # 時間数チェック
            try:
                hours_decimal = Decimal(str(hours))
                if hours_decimal <= 0:
                    errors.append(f'行{idx}: 時間数は0より大きい値である必要があります')
                    continue
            except (ValueError, TypeError):
                errors.append(f'行{idx}: 時間数 "{hours}" は数値として解釈できません')
                continue
            
            validated_rows.append({
                'category': category,
                'task_name': task_name,
                'hours': hours_decimal
            })
        
        if errors:
            return jsonify({
                'status': 'error',
                'message': 'バリデーションエラー',
                'errors': errors
            }), 400
        
        # トランザクション開始
        try:
            # 同一日付・同一ユーザーの既存レコードを削除
            TimeLog.query.filter(
                and_(
                    TimeLog.log_date == log_date,
                    TimeLog.user_id == 1
                )
            ).delete()
            
            # 新しいレコードを一括INSERT
            new_logs = []
            for row in validated_rows:
                new_log = TimeLog(
                    user_id=1,
                    log_date=log_date,
                    category=row['category'],
                    task_name=row['task_name'],
                    hours=row['hours']
                )
                new_logs.append(new_log)
            
            db.session.add_all(new_logs)
            db.session.commit()
            
            return jsonify({
                'status': 'ok',
                'message': 'time logs saved',
                'savedCount': len(validated_rows)
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'status': 'error',
                'message': f'データベースエラー: {str(e)}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'サーバーエラー: {str(e)}'
        }), 500


@app.route('/api/time-logs', methods=['GET'])
def get_time_logs():
    try:
        date_str = request.args.get('date')
        if not date_str:
            return jsonify({'status': 'error', 'message': 'dateパラメータが指定されていません'}), 400
        
        try:
            log_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'status': 'error', 'message': 'dateの形式が不正です（YYYY-MM-DD形式で指定してください）'}), 400
        
        # 該当日のデータを取得
        logs = TimeLog.query.filter(
            and_(
                TimeLog.log_date == log_date,
                TimeLog.user_id == 1
            )
        ).all()
        
        # レスポンス用のデータ構造を作成
        rows = []
        category_totals = {}
        
        for log in logs:
            row = {
                'category': log.category,
                'taskName': log.task_name,
                'hours': float(log.hours)
            }
            rows.append(row)
            
            # カテゴリ別合計を計算
            if log.category in category_totals:
                category_totals[log.category] += float(log.hours)
            else:
                category_totals[log.category] = float(log.hours)
        
        # categoryTotalsをリスト形式に変換
        category_totals_list = [
            {'category': cat, 'hours': hours}
            for cat, hours in category_totals.items()
        ]
        
        return jsonify({
            'logDate': date_str,
            'rows': rows,
            'categoryTotals': category_totals_list
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'サーバーエラー: {str(e)}'
        }), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)

