// 全局大寫輸入處理
(function () {
    'use strict';

    // 為所有文本輸入添加大寫轉換事件
    function initUppercaseInputs() {
        const selectors = [
            'input[type="text"]:not([readonly]):not(.no-uppercase)',
            'input:not([type]):not([readonly]):not(.no-uppercase)',
            '.input-bar:not([readonly]):not(.no-uppercase)',
            '.input-box:not([readonly]):not(.no-uppercase)',
            '.edit-box:not([readonly]):not(.no-uppercase)'
        ];

        const inputs = document.querySelectorAll(selectors.join(','));

        inputs.forEach(input => {
            // 添加 input 事件監聽器
            input.addEventListener('input', function (e) {
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = this.value.toUpperCase();
                this.setSelectionRange(start, end);
            });

            // 添加 paste 事件監聽器
            input.addEventListener('paste', function (e) {
                setTimeout(() => {
                    const start = this.selectionStart;
                    const end = this.selectionEnd;
                    this.value = this.value.toUpperCase();
                    this.setSelectionRange(start, end);
                }, 0);
            });
        });

        console.log(`Uppercase transformation initialized for ${inputs.length} inputs`);
    }

    // DOM 載入完成後初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUppercaseInputs);
    } else {
        initUppercaseInputs();
    }

    // 監聽動態添加的輸入框
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length) {
                initUppercaseInputs();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
