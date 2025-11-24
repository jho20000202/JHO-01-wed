// 回到頂端按鈕通用功能
(function () {
    // 等待 DOM 載入完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // 創建按鈕元素
        const backTopBtn = document.createElement('div');
        backTopBtn.id = 'backTopBtn';

        // 逐個設置樣式屬性，使用 setProperty 和 'important' 優先級
        backTopBtn.style.setProperty('position', 'fixed', 'important');
        backTopBtn.style.setProperty('right', '18px', 'important');
        backTopBtn.style.setProperty('bottom', '22px', 'important');
        backTopBtn.style.setProperty('width', '48px');
        backTopBtn.style.setProperty('height', '48px');
        backTopBtn.style.setProperty('border-radius', '50%');
        backTopBtn.style.setProperty('background', 'rgba(255, 255, 255, 0.15)');
        backTopBtn.style.setProperty('backdrop-filter', 'blur(6px)');
        backTopBtn.style.setProperty('display', 'flex');
        backTopBtn.style.setProperty('justify-content', 'center');
        backTopBtn.style.setProperty('align-items', 'center');
        backTopBtn.style.setProperty('cursor', 'pointer');
        backTopBtn.style.setProperty('z-index', '1000');
        backTopBtn.style.setProperty('opacity', '0');
        backTopBtn.style.setProperty('pointer-events', 'none');
        backTopBtn.style.setProperty('transition', 'opacity 0.3s ease, transform 0.25s ease');

        backTopBtn.innerHTML = `
            <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: #fff;">
                <path d="M12 4l-8 8h5v8h6v-8h5z"></path>
            </svg>
        `;

        // 添加到頁面
        document.body.appendChild(backTopBtn);

        // 滾動事件監聽
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backTopBtn.style.setProperty('opacity', '1');
                backTopBtn.style.setProperty('pointer-events', 'auto');
            } else {
                backTopBtn.style.setProperty('opacity', '0');
                backTopBtn.style.setProperty('pointer-events', 'none');
            }
        });

        // 懸停效果
        backTopBtn.addEventListener('mouseenter', () => {
            backTopBtn.style.setProperty('background', 'rgba(255, 255, 255, 0.25)');
            backTopBtn.style.setProperty('transform', 'scale(1.1)');
        });

        backTopBtn.addEventListener('mouseleave', () => {
            backTopBtn.style.setProperty('background', 'rgba(255, 255, 255, 0.15)');
            backTopBtn.style.setProperty('transform', 'scale(1)');
        });

        // 點擊事件監聽
        backTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
})();
