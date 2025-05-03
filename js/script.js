document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
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
    const backLink = document.querySelector('.back-link'); // Get back link

    // --- Quiz State ---
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let isQuestionFinalized = false; // True if answer is correct or skipped

    // --- Accessibility ---
    if (feedbackDiv) {
        feedbackDiv.setAttribute('aria-live', 'polite'); // Announce feedback changes
    }

    // --- Get Theme from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const theme = urlParams.get('theme');

    if (!theme) {
        handleFatalError('Ошибка: Тема квиза не выбрана.');
        return;
    }

    // Set quiz title
    const themeNumber = theme.replace('theme', ''); // Extract number for title
    quizTitle.textContent = `Квиз: Тема ${themeNumber}`; // Use extracted number

    // --- Load Questions ---
    fetch(`data/${theme}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Не удалось загрузить файл data/${theme}.json (Статус: ${response.status})`);
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error(`Файл data/${theme}.json пуст или имеет неверный формат.`);
            }
            currentQuestions = data;
            totalQuestionsSpan.textContent = currentQuestions.length;
            totalScoreSpan.textContent = currentQuestions.length; // Set total for results page early
            if (questionContainer) questionContainer.style.display = 'block'; // Ensure visible
            displayQuestion();
        })
        .catch(error => {
            console.error('Ошибка при загрузке или обработке вопросов:', error);
            handleFatalError(`Не удалось загрузить вопросы для темы "${themeNumber}". ${error.message}`);
        });

    // --- Fatal Error Handler ---
    function handleFatalError(message) {
        if (quizTitle) quizTitle.textContent = 'Ошибка Квиза';
        if (questionText) questionText.textContent = message;
        if (questionContainer) questionContainer.style.display = 'block'; // Show container for message
        if (optionsContainer) optionsContainer.innerHTML = ''; // Clear options
        if (submitButton) submitButton.style.display = 'none';
        if (nextButton) nextButton.style.display = 'none';
        if (resultsContainer) resultsContainer.style.display = 'none';
        if (feedbackDiv) { // Show error in feedback area
            feedbackDiv.textContent = `Ошибка: ${message}`;
            feedbackDiv.className = 'feedback incorrect'; // Use error styling
            feedbackDiv.style.display = 'block';
        }
         // Always show back link
        if (backLink) backLink.style.display = 'block';
    }


    // --- Display Question ---
    function displayQuestion() {
        if (currentQuestionIndex >= currentQuestions.length) {
            showResults();
            return;
        }

        isQuestionFinalized = false; // Reset finalization flag
        feedbackDiv.textContent = '';
        feedbackDiv.className = 'feedback'; // Reset feedback style
        feedbackDiv.style.display = 'none'; // Hide feedback initially
        submitButton.disabled = true; // Disable until an option is selected
        submitButton.textContent = 'Проверить ответ';
        submitButton.style.display = 'block';
        nextButton.style.display = 'none'; // Hide next/skip button initially
        nextButton.classList.remove('proceed'); // Remove green style if present

        const questionData = currentQuestions[currentQuestionIndex];
        currentQuestionSpan.textContent = currentQuestionIndex + 1;
        questionText.textContent = questionData.question;
        optionsContainer.innerHTML = ''; // Clear previous options

        // Clear previous highlights (needed if navigating back/forth was implemented)
        optionsContainer.querySelectorAll('.option').forEach(opt => {
             opt.classList.remove('correct-answer', 'incorrect-answer', 'selected');
             const input = opt.querySelector('input');
             if (input) input.disabled = false; // Re-enable inputs
         });


        const inputType = questionData.type === 'multiple' ? 'checkbox' : 'radio';

        questionData.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.classList.add('option');

            const input = document.createElement('input');
            input.type = inputType;
            input.name = 'option'; // Use same name for radio buttons
            input.value = index;
            input.id = `option-${index}`;
            input.dataset.index = index;

            const label = document.createElement('label');
            label.htmlFor = `option-${index}`;
            label.textContent = option;

            optionElement.appendChild(input);
            optionElement.appendChild(label);
            optionsContainer.appendChild(optionElement);

            // Event listener on the entire option element for better usability
            optionElement.addEventListener('click', (event) => {
                if (isQuestionFinalized) return; // Don't allow changes after finalizing

                 // Prevent double-triggering if label/input is clicked directly
                if (event.target === optionElement || event.target === label) {
                    if (inputType === 'radio') {
                        input.checked = true;
                         // Manually trigger change event for radio to update button state
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        input.checked = !input.checked;
                        // Manually trigger change event for checkbox
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                 // Don't call handleOptionSelection here, rely on 'change' event
            });

            // Handle state change on the input itself
            input.addEventListener('change', () => {
                if (isQuestionFinalized) return;
                handleOptionSelection();
            });
        });

        // Ensure initial button state is correct
        handleOptionSelection();

        // Scroll question into view
        if (questionContainer) {
            questionContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // --- Handle Option Selection ---
    function handleOptionSelection() {
        if (isQuestionFinalized) {
            submitButton.disabled = true;
            return;
        }
        const checkedInputs = optionsContainer.querySelectorAll('input:checked');

        // Clear previous 'selected' markers if user changes mind before submitting
        optionsContainer.querySelectorAll('.option.selected').forEach(opt => {
            opt.classList.remove('selected');
        });
        // Mark currently checked options
        checkedInputs.forEach(input => {
             input.closest('.option')?.classList.add('selected');
        });


        submitButton.disabled = checkedInputs.length === 0;
    }

    // --- Check Answer ---
    function checkAnswer() {
        // Clear previous feedback and styles before new check
        feedbackDiv.textContent = '';
        feedbackDiv.className = 'feedback';
        feedbackDiv.style.display = 'none'; // Hide feedback area initially
        optionsContainer.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('correct-answer', 'incorrect-answer');
            // Keep the 'selected' class for now to see what was chosen
        });

        const questionData = currentQuestions[currentQuestionIndex];
        const correctAnswers = questionData.correctAnswers.map(String); // Ensure string comparison

        const selectedInputs = optionsContainer.querySelectorAll('input:checked');
        const selectedAnswers = Array.from(selectedInputs).map(input => input.value);

        // Sort for comparison (important for multiple choice)
        const sortedSelected = [...selectedAnswers].sort();
        const sortedCorrect = [...correctAnswers].sort();
        const isCorrect = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);

        // Disable inputs only AFTER checking
        const allInputs = optionsContainer.querySelectorAll('input');


        // Provide feedback and highlighting
        feedbackDiv.style.display = 'block'; // Show feedback area
        optionsContainer.querySelectorAll('.option').forEach(opt => {
            const input = opt.querySelector('input');
            if (!input) return;
            const isCorrectAnswer = correctAnswers.includes(input.value);
            const isSelected = input.checked;

            if (isCorrectAnswer) {
                opt.classList.add('correct-answer');
            } else if (isSelected && !isCorrectAnswer) {
                opt.classList.add('incorrect-answer');
            }
        });


        if (isCorrect) {
            isQuestionFinalized = true; // Finalize on correct answer
            feedbackDiv.textContent = 'Правильно!';
            feedbackDiv.className = 'feedback correct';
            score++; // Increment score

            allInputs.forEach(input => input.disabled = true); // Disable all inputs
            optionsContainer.querySelectorAll('.option').forEach(opt => opt.style.cursor = 'default'); // Change cursor


            submitButton.style.display = 'none'; // Hide submit button
            submitButton.disabled = true;

            // Configure and show Next button
            if (currentQuestionIndex < currentQuestions.length - 1) {
                nextButton.textContent = 'Следующий вопрос';
            } else {
                nextButton.textContent = 'Показать результаты';
            }
            nextButton.classList.add('proceed'); // Style as green
            nextButton.style.display = 'block';
            nextButton.disabled = false; // Ensure enabled
        } else {
            isQuestionFinalized = false; // Allow retry
            feedbackDiv.textContent = 'Неправильно. Попробуйте еще раз или пропустите.';
            feedbackDiv.className = 'feedback incorrect';

             // Don't disable inputs, allow user to change selection
             allInputs.forEach(input => input.disabled = false);
             optionsContainer.querySelectorAll('.option').forEach(opt => opt.style.cursor = 'pointer'); // Keep pointer

            submitButton.textContent = 'Попробовать снова';
            submitButton.disabled = false; // Ensure retry button is enabled
            submitButton.style.display = 'block';

            // Configure and show Skip button
            nextButton.textContent = 'Пропустить вопрос';
            nextButton.classList.remove('proceed'); // Style as grey/default
            nextButton.style.display = 'block';
            nextButton.disabled = false; // Ensure enabled
        }
         // Scroll to feedback smoothly
         feedbackDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // --- Next/Skip Question ---
    function nextQuestion() {
        // Whether skipping or moving after correct answer, the question is done.
        isQuestionFinalized = true; // Mark as finalized before moving on
        currentQuestionIndex++;
        displayQuestion(); // Display next or results
    }

    // --- Show Results ---
    function showResults() {
        if (questionContainer) questionContainer.style.display = 'none';
        if (submitButton) submitButton.style.display = 'none';
        if (nextButton) nextButton.style.display = 'none';
        if (feedbackDiv) feedbackDiv.style.display = 'none';
        if (backLink) backLink.style.display = 'none'; // Hide back link on results

        scoreSpan.textContent = score;
        // totalScoreSpan is already set during load
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // --- Event Listeners ---
    if (submitButton) submitButton.addEventListener('click', checkAnswer);
    if (nextButton) nextButton.addEventListener('click', nextQuestion); // Handles both Skip and Next

});