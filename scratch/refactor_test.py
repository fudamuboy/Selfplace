import re

with open('app/personality-test/[type].tsx', 'r') as f:
    content = f.read()

# Replace local states with Zustand
store_import = "import usePersonalitySessionStore from '../../store/usePersonalitySessionStore';\nimport useThemeStore from '../../store/useThemeStore';"
content = content.replace("import useThemeStore from '../../store/useThemeStore';", store_import)

# Replace state definitions
old_state = """  const [testData, setTestData] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialText, setInterstitialText] = useState("");

  const [dimensionScores, setDimensionScores] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchTest();
  }, [type]);

  const fetchTest = async () => {
    try {
      // Force 'journey' for the new unified test
      const res = await client.get(`/personality/tests/journey`);
      setTestData(res.data.test);
    } catch (err: any) {
      console.error(`[PersonalityTest] Error fetching test:`, err.message || err);
      setTestData(null);
      setTimeout(() => router.back(), 2000);
    } finally {
      setLoading(false);
    }
  };"""

new_state = """  const { 
    isActive, questions, currentIndex, answers, dimensionScores,
    startSession, answerQuestion, nextQuestion, endSession 
  } = usePersonalitySessionStore();
  
  const [loading, setLoading] = useState(!isActive);
  const [submitting, setSubmitting] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialText, setInterstitialText] = useState("");

  useEffect(() => {
    if (!isActive) {
      fetchTest();
    } else {
      setLoading(false);
    }
  }, [isActive, type]);

  const fetchTest = async () => {
    try {
      const res = await client.get(`/personality/tests/journey`);
      if (res.data && res.data.test && res.data.test.questions) {
        startSession(res.data.test.questions);
      } else {
        throw new Error('Invalid test data');
      }
    } catch (err: any) {
      console.error(`[PersonalityTest] Error fetching test:`, err.message || err);
      setTimeout(() => router.back(), 2000);
    } finally {
      setLoading(false);
    }
  };"""

content = content.replace(old_state, new_state)

# Replace handleSelectOption
old_handleSelectOption = """  const handleSelectOption = async (questionId: string, optionIndex: number, option: Option) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Update local scores for confidence tracking
    const newScores = { ...dimensionScores };
    if (option.weights) {
      for (const [dim, weight] of Object.entries(option.weights)) {
        newScores[dim] = (newScores[dim] || 0) + weight;
      }
    }
    setDimensionScores(newScores);

    const newAnswers = { ...answers, [questionId]: optionIndex };
    setAnswers(newAnswers);

    const nextIndex = currentIndex + 1;
    
    // Adaptive Logic
    const maxScore = Math.max(0, ...Object.values(newScores).map(v => Math.abs(v)));
    
    let shouldEndEarly = false;
    if (nextIndex >= 20 && nextIndex < 35 && maxScore >= 18) {
      shouldEndEarly = true; // Very high confidence
    } else if (nextIndex >= 35 && maxScore >= 12) {
      shouldEndEarly = true; // Normal confidence
    }

    if (shouldEndEarly || nextIndex >= (testData?.questions.length || 0)) {
      submitTest(newAnswers);
      return;
    }

    // Interstitial Logic
    if (nextIndex % 12 === 0) {
      const textIndex = (nextIndex / 12 - 1) % INTERSTITIALS.length;
      setInterstitialText(INTERSTITIALS[textIndex]);
      setShowInterstitial(true);
      setTimeout(() => {
        setShowInterstitial(false);
        setCurrentIndex(nextIndex);
      }, 3000);
    } else {
      setTimeout(() => {
        setCurrentIndex(nextIndex);
      }, 400);
    }
  };"""

new_handleSelectOption = """  const handleSelectOption = async (questionId: string, optionIndex: number, option: Option) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // 1. Commit answer to Zustand session store securely
    answerQuestion(questionId, optionIndex, option.weights || {});

    // 2. Predict adaptive behavior
    const nIdx = currentIndex + 1;
    const currentMaxScore = Math.max(0, ...Object.values(dimensionScores).map(v => Math.abs(v)));
    
    let shouldEndEarly = false;
    if (nIdx >= 20 && nIdx < 35 && currentMaxScore >= 18) {
      shouldEndEarly = true; // Very high confidence
    } else if (nIdx >= 35 && currentMaxScore >= 12) {
      shouldEndEarly = true; // Normal confidence
    }

    // 3. Next step execution
    if (shouldEndEarly || nIdx >= questions.length) {
      // Must use the updated answers from Zustand or construct it manually for submission
      const finalAnswers = { ...answers, [questionId]: optionIndex };
      submitTest(finalAnswers);
      return;
    }

    if (nIdx % 12 === 0) {
      const textIndex = (nIdx / 12 - 1) % INTERSTITIALS.length;
      setInterstitialText(INTERSTITIALS[textIndex]);
      setShowInterstitial(true);
      setTimeout(() => {
        setShowInterstitial(false);
        nextQuestion();
      }, 3000);
    } else {
      setTimeout(() => {
        nextQuestion();
      }, 400);
    }
  };"""

content = content.replace(old_handleSelectOption, new_handleSelectOption)

# Replace testData usage
content = content.replace("!testData", "(!isActive || questions.length === 0)")

content = content.replace("testData?.questions.length || 0", "questions.length")
content = content.replace("const currentQuestion = testData.questions[currentIndex];", "const currentQuestion = questions[currentIndex];")

# Clear session on cancel
content = content.replace(
    "onPress={() => router.back()}",
    "onPress={() => { endSession(); router.back(); }}"
)

# Clear session on submit success
content = content.replace(
    "router.replace({",
    "endSession();\n      router.replace({"
)

# Clear session on submit error if critical? Actually no, let's just keep it active so they can try again.

with open('app/personality-test/[type].tsx', 'w') as f:
    f.write(content)

