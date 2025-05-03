document.addEventListener('DOMContentLoaded', () => {
    // Элементы DOM
    const quizTitle = document.getElementById('quiz-title');
    const questionContainer = document.getElementById('question-container');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const feedbackDiv = document.getElementById('feedback');
    const submitButton = document.getElementById('submit-button');
    const nextButton = document.getElementById('next-button');
    const resultsContainer = document.getElementById('results-container');
    const scoreSpan = document.getElementById('score');
    const totalScoreSpan = document.getElementById('total-score');
    const currentQuestionSpan = document.getElementById('current-question');
    const totalQuestionsSpan = document.getElementById('total-questions');

    // Переменные состояния квиза
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    // let selectedAnswers = []; // Не нужна глобально, будем получать в checkAnswer
    let isQuestionFinalized = false; // Флаг: true, если ответ верный или вопрос пропущен

    // --- Получение темы из URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const theme = urlParams.get('theme');

    if (!theme) {
        questionText.textContent = 'Ошибка: Тема квиза не выбрана.';
        if (submitButton) submitButton.style.display = 'none';
        if (nextButton) nextButton.style.display = 'none';
        if (resultsContainer) resultsContainer.style.display = 'none';
        if (questionContainer) questionContainer.style.display = 'none';
        // Показываем ссылку назад даже при ошибке
        const backLink = document.querySelector('.back-link');
        if (backLink) backLink.style.display = 'block';
        return;
    }

    // Устанавливаем заголовок квиза
    quizTitle.textContent = `Квиз: Тема ${theme.replace('theme', '')}`;

    // --- Загрузка вопросов ---
    fetch(`data/${theme}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Не удалось загрузить файл data/${theme}.json. Статус: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                 throw new Error(`Файл data/${theme}.json пуст или имеет неверный формат.`);
            }
            currentQuestions = data;
            totalQuestionsSpan.textContent = currentQuestions.length;
            totalScoreSpan.textContent = currentQuestions.length;
            displayQuestion();
        })
        .catch(error => {
            console.error('Ошибка при загрузке или обработке вопросов:', error);
            questionText.textContent = `Не удалось загрузить вопросы для темы "${theme}".`;
            if (questionContainer) questionContainer.style.display = 'none';
             if (submitButton) submitButton.style.display = 'none';
             if (nextButton) nextButton.style.display = 'none';
             feedbackDiv.textContent = `Ошибка: ${error.message}`;
             feedbackDiv.className = 'feedback incorrect';
             feedbackDiv.style.display = 'block'; // Убедимся, что сообщение об ошибке видно
        });

    // --- Отображение вопроса ---
    function displayQuestion() {
        isQuestionFinalized = false; // Сброс флага финализации
        feedbackDiv.textContent = '';
        feedbackDiv.className = 'feedback';
        submitButton.disabled = true; // Блокируем до выбора
        submitButton.textContent = 'Проверить ответ'; // Сброс текста кнопки
        submitButton.style.display = 'block';
        nextButton.style.display = 'none'; // Скрываем кнопку "Следующий/Пропустить"

        if (currentQuestionIndex >= currentQuestions.length) {
            showResults();
            return;
        }

        const questionData = currentQuestions[currentQuestionIndex];
        currentQuestionSpan.textContent = currentQuestionIndex + 1;
        questionText.textContent = questionData.question;
        optionsContainer.innerHTML = ''; // Очистка

        const inputType = questionData.type === 'multiple' ? 'checkbox' : 'radio';

        questionData.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.classList.add('option');

            const input = document.createElement('input');
            input.type = inputType;
            input.name = 'option';
            input.value = index;
            input.id = `option-${index}`;
            input.dataset.index = index; // Сохраняем индекс

            const label = document.createElement('label');
            label.htmlFor = `option-${index}`;
            label.textContent = option;

            optionElement.appendChild(input);
            optionElement.appendChild(label);
            optionsContainer.appendChild(optionElement);

            // Обработчик клика на весь блок опции
            optionElement.addEventListener('click', (event) => {
                if (isQuestionFinalized) return; // Нельзя менять выбор после финализации

                if (event.target !== input) {
                    input.checked = (inputType === 'checkbox') ? !input.checked : true;
                     // Для radio нужно снять checked с других при клике на label
                     if (inputType === 'radio') {
                        optionsContainer.querySelectorAll('input[type="radio"]').forEach(radio => {
                            if (radio !== input) radio.checked = false;
                        });
                     }
                }
                 // Нужно вызвать handleOptionSelection после имитации клика
                 handleOptionSelection();
            });

            // Обработчик на сам input
             input.addEventListener('change', () => {
                 if (isQuestionFinalized) return;
                 handleOptionSelection();
             });
        });
         // Первичная проверка состояния кнопки после рендера
         handleOptionSelection();
    }

     // --- Обработка выбора опции ---
     function handleOptionSelection() {
         // Не позволяем активировать кнопку, если вопрос финализирован
         if (isQuestionFinalized) {
             submitButton.disabled = true;
             return;
         }
         const checkedInputs = optionsContainer.querySelectorAll('input:checked');
         submitButton.disabled = checkedInputs.length === 0;
     }


    // --- Проверка ответа ---
    function checkAnswer() {
        // Очищаем предыдущие стили и фидбек перед новой проверкой (важно для ретрая)
        feedbackDiv.textContent = '';
        feedbackDiv.className = 'feedback';
        optionsContainer.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('correct-answer', 'incorrect-answer', 'selected');
        });

        const questionData = currentQuestions[currentQuestionIndex];
        const correctAnswers = questionData.correctAnswers.map(String); // Строки для сравнения

        const selectedAnswers = [];
        const inputs = optionsContainer.querySelectorAll('input');
        let isCorrect = false;

        inputs.forEach((input) => {
             const optionDiv = input.closest('.option');
             const isSelected = input.checked;
             const isCorrectAnswer = correctAnswers.includes(input.value);

             if (isSelected) {
                 selectedAnswers.push(input.value);
                 optionDiv.classList.add('selected'); // Помечаем выбранные в ЭТОЙ попытке
             }

             // Подсветка правильных/неправильных (показываем всегда после проверки)
             if (isCorrectAnswer) {
                 optionDiv.classList.add('correct-answer');
             } else if (isSelected && !isCorrectAnswer) {
                 optionDiv.classList.add('incorrect-answer');
             }
             // Пока не блокируем инпуты здесь
         });

        // Сравнение массивов
        const sortedSelected = [...selectedAnswers].sort();
        const sortedCorrect = [...correctAnswers].sort();
        isCorrect = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);

        // Показываем обратную связь и управляем кнопками
        if (isCorrect) {
            isQuestionFinalized = true; // Финализируем вопрос
            feedbackDiv.textContent = 'Правильно!';
            feedbackDiv.className = 'feedback correct';
            score++; // Увеличиваем счет

            // Блокируем инпуты после правильного ответа
            inputs.forEach(input => input.disabled = true);

            submitButton.style.display = 'none'; // Скрываем "Проверить"
            submitButton.disabled = true; // На всякий случай

            // Настраиваем кнопку "Следующий"
            if (currentQuestionIndex < currentQuestions.length - 1) {
                nextButton.textContent = 'Следующий вопрос';
            } else {
                nextButton.textContent = 'Показать результаты';
            }
            nextButton.style.display = 'block'; // Показываем кнопку "Следующий"

        } else {
            isQuestionFinalized = false; // НЕ финализируем, даем шанс
            feedbackDiv.textContent = `Неправильно. Попробуйте еще раз или пропустите. Правильные ответы отмечены зеленым.`;
            feedbackDiv.className = 'feedback incorrect';

            // Инпуты НЕ блокируем, позволяем изменить выбор

            submitButton.textContent = 'Попробовать снова';
            submitButton.disabled = false; // Разрешаем нажать "Попробовать снова"
            submitButton.style.display = 'block'; // Убедимся, что она видна

            nextButton.textContent = 'Пропустить вопрос';
            nextButton.style.display = 'block'; // Показываем кнопку "Пропустить"
        }
    }

    // --- Переход к следующему вопросу (или пропуск) ---
    function nextQuestion() {
        // В любом случае (пропуск или переход дальше), вопрос считается завершенным
        isQuestionFinalized = true; // Помечаем как финальный перед переходом
        currentQuestionIndex++;
        displayQuestion(); // Отображаем следующий вопрос или результаты
    }

    // --- Показ результатов ---
    function showResults() {
        questionContainer.style.display = 'none';
        submitButton.style.display = 'none';
        nextButton.style.display = 'none';
        feedbackDiv.style.display = 'none';

        scoreSpan.textContent = score;
        resultsContainer.style.display = 'block';
    }

    // --- Назначение обработчиков событий ---
    submitButton.addEventListener('click', checkAnswer);
    nextButton.addEventListener('click', nextQuestion); // Эта кнопка теперь и пропускает, и переходит дальше
});