import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Modal,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Categories with their respective colors
const CATEGORIES = [
  { id: 1, name: 'Продукты', color: '#FF9800' },
  { id: 2, name: 'Транспорт', color: '#2196F3' },
  { id: 3, name: 'Развлечения', color: '#E91E63' },
  { id: 4, name: 'Счета', color: '#4CAF50' },
  { id: 5, name: 'Другое', color: '#9C27B0' },
];

// Default currencies
const DEFAULT_CURRENCIES = [
  { code: 'RUB', symbol: '₽', name: 'Российский рубль' },
  { code: 'USD', symbol: '$', name: 'Доллар США' },
  { code: 'EUR', symbol: '€', name: 'Евро' },
];

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [conversionModalVisible, setConversionModalVisible] = useState(false);
  const [totalExpense, setTotalExpense] = useState(0);
  
  // Currency states
  const [currencies, setCurrencies] = useState(DEFAULT_CURRENCIES);
  const [primaryCurrency, setPrimaryCurrency] = useState(DEFAULT_CURRENCIES[0]);
  const [selectedCurrency, setSelectedCurrency] = useState(DEFAULT_CURRENCIES[0]);
  const [exchangeRates, setExchangeRates] = useState({});
  const [newCurrencyCode, setNewCurrencyCode] = useState('');
  const [newCurrencyName, setNewCurrencyName] = useState('');
  const [newCurrencySymbol, setNewCurrencySymbol] = useState('');
  
  // Conversion states
  const [fromCurrency, setFromCurrency] = useState(DEFAULT_CURRENCIES[0]);
  const [toCurrency, setToCurrency] = useState(DEFAULT_CURRENCIES[1]);
  const [conversionAmount, setConversionAmount] = useState('');
  const [conversionRate, setConversionRate] = useState('');
  const [conversionResult, setConversionResult] = useState('');

  // Load data from AsyncStorage on app start
  useEffect(() => {
    loadData();
  }, []);

  // Update total expense whenever expenses or primary currency change
  useEffect(() => {
    calculateTotalExpense();
  }, [expenses, primaryCurrency]);

  // Save all data to AsyncStorage
  const saveData = async () => {
    try {
      const data = {
        expenses,
        currencies,
        primaryCurrency,
        exchangeRates
      };
      await AsyncStorage.setItem('expenseTrackerData', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data', error);
    }
  };

  // Load all data from AsyncStorage
  const loadData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('expenseTrackerData');
      if (savedData) {
        const data = JSON.parse(savedData);
        setExpenses(data.expenses || []);
        setCurrencies(data.currencies || DEFAULT_CURRENCIES);
        setPrimaryCurrency(data.primaryCurrency || DEFAULT_CURRENCIES[0]);
        setExchangeRates(data.exchangeRates || {});
      }
    } catch (error) {
      console.error('Error loading data', error);
    }
  };

  // Calculate total expense in primary currency
  const calculateTotalExpense = () => {
    const total = expenses.reduce((sum, expense) => {
      if (expense.currency.code === primaryCurrency.code) {
        return sum + expense.amount;
      } else {
        // Convert to primary currency using stored exchange rate
        const rate = getExchangeRate(expense.currency.code, primaryCurrency.code);
        return sum + (expense.amount / rate);
      }
    }, 0);
    setTotalExpense(total);
  };

  // Get exchange rate between two currencies
  const getExchangeRate = (fromCode, toCode) => {
    if (fromCode === toCode) return 1;
    
    const key = `${fromCode}_${toCode}`;
    const inverseKey = `${toCode}_${fromCode}`;
    
    if (exchangeRates[key]) {
      return exchangeRates[key].rate;
    } else if (exchangeRates[inverseKey]) {
      return 1 / exchangeRates[inverseKey].rate;
    }
    
    return 1; // Default to 1 if no rate is found
  };

  // Update or add an exchange rate
  const updateExchangeRate = (fromCode, toCode, rate) => {
    const key = `${fromCode}_${toCode}`;
    const newRates = { ...exchangeRates };
    
    if (!newRates[key]) {
      newRates[key] = {
        rate: parseFloat(rate),
        history: [{ rate: parseFloat(rate), date: new Date().toISOString() }]
      };
    } else {
      // Add to history and calculate average
      newRates[key].history.push({ rate: parseFloat(rate), date: new Date().toISOString() });
      // Calculate average of last 10 rates
      const recentRates = newRates[key].history.slice(-10);
      const avgRate = recentRates.reduce((sum, entry) => sum + entry.rate, 0) / recentRates.length;
      newRates[key].rate = avgRate;
    }
    
    setExchangeRates(newRates);
    return newRates;
  };

  // Add a new expense
  const addExpense = () => {
    if (amount && !isNaN(parseFloat(amount))) {
      const newExpense = {
        id: Date.now().toString(),
        amount: parseFloat(amount),
        description,
        category: selectedCategory,
        date: new Date().toISOString(),
        currency: selectedCurrency,
        primaryAmount: selectedCurrency.code === primaryCurrency.code 
          ? parseFloat(amount) 
          : parseFloat(amount) / getExchangeRate(selectedCurrency.code, primaryCurrency.code)
      };
      
      const newExpenses = [...expenses, newExpense];
      setExpenses(newExpenses);
      
      // Save all data
      saveData();
      
      // Reset form
      setAmount('');
      setDescription('');
      setSelectedCategory(CATEGORIES[0]);
      setSelectedCurrency(primaryCurrency);
      setModalVisible(false);
    }
  };

  // Delete an expense
  const deleteExpense = (id) => {
    const newExpenses = expenses.filter(expense => expense.id !== id);
    setExpenses(newExpenses);
    saveData();
  };

  // Add a new currency
  const addCurrency = () => {
    if (newCurrencyCode && newCurrencySymbol && newCurrencyName) {
      const newCurrency = {
        code: newCurrencyCode.toUpperCase(),
        symbol: newCurrencySymbol,
        name: newCurrencyName
      };
      
      const updatedCurrencies = [...currencies, newCurrency];
      setCurrencies(updatedCurrencies);
      
      // Reset form
      setNewCurrencyCode('');
      setNewCurrencySymbol('');
      setNewCurrencyName('');
      
      // Save data
      saveData();
    }
  };

  // Set primary currency
  const setPrimaryCurrencyHandler = (currency) => {
    setPrimaryCurrency(currency);
    saveData();
    setSettingsModalVisible(false);
  };

  // Handle currency conversion
  const handleConversion = () => {
    if (conversionAmount && conversionRate && !isNaN(parseFloat(conversionAmount)) && !isNaN(parseFloat(conversionRate))) {
      // Calculate result
      const result = parseFloat(conversionAmount) * parseFloat(conversionRate);
      setConversionResult(result.toFixed(2));
      
      // Update exchange rate
      const newRates = updateExchangeRate(fromCurrency.code, toCurrency.code, parseFloat(conversionRate));
      setExchangeRates(newRates);
      
      // Save data
      saveData();
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  };

  // Render each expense item
  const renderExpenseItem = ({ item }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseDetails}>
        <View style={[styles.categoryIndicator, { backgroundColor: item.category.color }]} />
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription}>{item.description || item.category.name}</Text>
          <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
        </View>
      </View>
      <View style={styles.expenseAmountContainer}>
        <View>
          <Text style={styles.expenseAmount}>
            {item.amount.toFixed(2)} {item.currency.symbol}
          </Text>
          {item.currency.code !== primaryCurrency.code && (
            <Text style={styles.convertedAmount}>
              ≈ {(item.amount / getExchangeRate(item.currency.code, primaryCurrency.code)).toFixed(2)} {primaryCurrency.symbol}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => deleteExpense(item.id)} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Group expenses by date
  const groupedExpenses = expenses.reduce((groups, expense) => {
    const date = formatDate(expense.date);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(expense);
    return groups;
  }, {});

  // Convert grouped expenses to array for FlatList
  const groupedExpensesArray = Object.keys(groupedExpenses).map(date => ({
    date,
    data: groupedExpenses[date],
  })).sort((a, b) => new Date(b.data[0].date) - new Date(a.data[0].date));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Учёт расходов</Text>
          <TouchableOpacity onPress={() => setSettingsModalVisible(true)}>
            <Text style={styles.settingsButton}>⚙️</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.totalExpense}>
          Всего: {totalExpense.toFixed(2)} {primaryCurrency.symbol}
        </Text>
      </View>
      
      {/* Expense List */}
      {expenses.length > 0 ? (
        <FlatList
          data={groupedExpensesArray}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <View style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{item.date}</Text>
              <FlatList
                data={item.data}
                keyExtractor={(expense) => expense.id}
                renderItem={renderExpenseItem}
              />
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Нет расходов. Добавьте свой первый расход!</Text>
        </View>
      )}
      
      {/* Add Expense Button */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
      
      {/* Add Expense Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Добавить расход</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Сумма"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Описание (необязательно)"
              value={description}
              onChangeText={setDescription}
            />
            
            {/* Currency Selector */}
            <Text style={styles.categoryLabel}>Валюта:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll}>
              {currencies.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.currencyButton,
                    selectedCurrency.code === currency.code && styles.selectedCurrency
                  ]}
                  onPress={() => setSelectedCurrency(currency)}
                >
                  <Text style={styles.currencyButtonText}>
                    {currency.code} ({currency.symbol})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={styles.categoryLabel}>Категория:</Text>
            <View style={styles.categoryContainer}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    { backgroundColor: category.color },
                    selectedCategory.id === category.id && styles.selectedCategory
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={styles.categoryButtonText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Отмена</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]} 
                onPress={addExpense}
              >
                <Text style={styles.buttonText}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Настройки</Text>
            
            <Text style={styles.settingsHeader}>Основная валюта:</Text>
            <Text style={styles.settingsSubtext}>Выберите валюту, в которой вы получаете доход</Text>
            
            <ScrollView style={styles.settingsList}>
              {currencies.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.settingsItem,
                    primaryCurrency.code === currency.code && styles.selectedSettingsItem
                  ]}
                  onPress={() => setPrimaryCurrencyHandler(currency)}
                >
                  <Text style={styles.settingsItemText}>
                    {currency.name} ({currency.code}) {currency.symbol}
                  </Text>
                  {primaryCurrency.code === currency.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.settingsButtonsRow}>
              <TouchableOpacity 
                style={styles.settingsActionButton} 
                onPress={() => {
                  setSettingsModalVisible(false);
                  setCurrencyModalVisible(true);
                }}
              >
                <Text style={styles.settingsActionButtonText}>Добавить валюту</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.settingsActionButton} 
                onPress={() => {
                  setSettingsModalVisible(false);
                  setConversionModalVisible(true);
                }}
              >
                <Text style={styles.settingsActionButtonText}>Конвертировать</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton, { marginTop: 16 }]} 
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.buttonText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Add Currency Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={currencyModalVisible}
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Добавить валюту</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Код валюты (например, USD)"
              value={newCurrencyCode}
              onChangeText={setNewCurrencyCode}
              maxLength={3}
              autoCapitalize="characters"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Символ валюты (например, $)"
              value={newCurrencySymbol}
              onChangeText={setNewCurrencySymbol}
              maxLength={3}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Название валюты"
              value={newCurrencyName}
              onChangeText={setNewCurrencyName}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => setCurrencyModalVisible(false)}
              >
                <Text style={styles.buttonText}>Отмена</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]} 
                onPress={() => {
                  addCurrency();
                  setCurrencyModalVisible(false);
                }}
              >
                <Text style={styles.buttonText}>Добавить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Currency Conversion Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={conversionModalVisible}
        onRequestClose={() => setConversionModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Конвертация валют</Text>
            
            <View style={styles.conversionRow}>
              <View style={styles.conversionHalf}>
                <Text style={styles.conversionLabel}>Из:</Text>
                <ScrollView style={styles.conversionCurrencyList}>
                  {currencies.map((currency) => (
                    <TouchableOpacity
                      key={`from_${currency.code}`}
                      style={[
                        styles.conversionCurrencyItem,
                        fromCurrency.code === currency.code && styles.selectedConversionCurrency
                      ]}
                      onPress={() => setFromCurrency(currency)}
                    >
                      <Text style={styles.conversionCurrencyText}>
                        {currency.code} ({currency.symbol})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.conversionHalf}>
                <Text style={styles.conversionLabel}>В:</Text>
                <ScrollView style={styles.conversionCurrencyList}>
                  {currencies.map((currency) => (
                    <TouchableOpacity
                      key={`to_${currency.code}`}
                      style={[
                        styles.conversionCurrencyItem,
                        toCurrency.code === currency.code && styles.selectedConversionCurrency
                      ]}
                      onPress={() => setToCurrency(currency)}
                    >
                      <Text style={styles.conversionCurrencyText}>
                        {currency.code} ({currency.symbol})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder={`Сумма в ${fromCurrency.code}`}
              keyboardType="numeric"
              value={conversionAmount}
              onChangeText={setConversionAmount}
            />
            
            <TextInput
              style={styles.input}
              placeholder={`Курс (1 ${fromCurrency.code} = X ${toCurrency.code})`}
              keyboardType="numeric"
              value={conversionRate}
              onChangeText={setConversionRate}
            />
            
            <TouchableOpacity 
              style={[styles.button, styles.saveButton, { marginBottom: 16 }]} 
              onPress={handleConversion}
            >
              <Text style={styles.buttonText}>Конвертировать</Text>
            </TouchableOpacity>
            
            {conversionResult ? (
              <View style={styles.conversionResult}>
                <Text style={styles.conversionResultText}>
                  {conversionAmount} {fromCurrency.symbol} = {conversionResult} {toCurrency.symbol}
                </Text>
                <Text style={styles.conversionRateText}>
                  Курс: 1 {fromCurrency.code} = {conversionRate} {toCurrency.code}
                </Text>
                <Text style={styles.conversionNoteText}>
                  Курс сохранен и будет использоваться для автоматической конвертации
                </Text>
              </View>
            ) : null}
            
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={() => setConversionModalVisible(false)}
            >
              <Text style={styles.buttonText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsButton: {
    fontSize: 24,
  },
  totalExpense: {
    fontSize: 16,
    color: '#757575',
    marginTop: 4,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: '#e0e0e0',
    fontWeight: '500',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  expenseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '500',
  },
  expenseDate: {
    fontSize: 14,
    color: '#757575',
  },
  expenseAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  convertedAmount: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'right',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#FF5252',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonText: {
    fontSize: 24,
    color: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 5,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedCategory: {
    borderWidth: 2,
    borderColor: '#000',
  },
  categoryButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  currencyScroll: {
    marginBottom: 16,
  },
  currencyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#e0e0e0',
  },
  selectedCurrency: {
    backgroundColor: '#2196F3',
  },
  currencyButtonText: {
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    marginLeft: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 16,
  },
  // Settings styles
  settingsHeader: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingsSubtext: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },
  settingsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedSettingsItem: {
    backgroundColor: '#e3f2fd',
  },
  settingsItemText: {
    fontSize: 16,
  },
  checkmark: {
    color: '#2196F3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingsButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingsActionButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  settingsActionButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  // Conversion styles
  conversionRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  conversionHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  conversionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  conversionCurrencyList: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  conversionCurrencyItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedConversionCurrency: {
    backgroundColor: '#e3f2fd',
  },
  conversionCurrencyText: {
    fontSize: 14,
  },
  conversionResult: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  conversionResultText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  conversionRateText: {
    fontSize: 14,
    marginBottom: 4,
  },
  conversionNoteText: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
});