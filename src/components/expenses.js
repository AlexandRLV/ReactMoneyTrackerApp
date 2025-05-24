import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";

const ExpenseList = ({
    expenses,
    primaryCurrency,
    onDeleteExpense,
    getExchangeRate,
}) => {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return '${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}';
    };

    const renderExpenseItem = ({ item }) => (
        <View style={styles.expenseItem}>
            <View styles={styles.expenseDetails}>
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
                    {item.currency.code !== primaryCurrency && (
                        <Text style={styles.expenseAmount}>
                           ≈ {getExchangeRate(item.amount, item.currency.code, primaryCurrency).toFixed(2)} {primaryCurrency}
                        </Text>
                    )}
                </View>
                <TouchableOpacity onPress={() => onDeleteExpense(item.id)} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>X</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const groupedExpenses = expenses.reduce((groups, expense) => {
        const date = formatDate(expense.date);
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(expense);
        return groups;
    }, {});

    const groupedExpensesArray = Object.keys(groupedExpenses).map((date) => ({
        date,
        expenses: groupedExpenses[date],
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (expenses.length === 0) {
        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Нет расходов. Добавьте свой первый расход.</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={groupedExpensesArray}
            keyExtractor={(item) => item.date}
            renderItem={({ item}) => (
                <View style={styles.dateGroup}>
                    <Text style={styles.dateHeader}>{item.date}</Text>
                    <FlatList
                        data={item.expenses}
                        keyExtractor={(expense) => expense.id}
                        renderItem={renderExpenseItem}
                    />
                </View>
            )}
        />
    );
};

const styles = StyleSheet.create({
    dateGroup: {
        marginBottom: 16,
    },
    dateHeader: {
        padding: 8,
        paddingHorizontal: 16,
        backgroundColor: "#e0e0e0",
        fontWeight: 500,
    },
    expenseItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    expenseDetails: {
        flexDirection: "row",
        alignItems: "center",
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
        fontWeight: 500,
    },
    expenseDate: {
        fontSize: 14,
        color: "#757575",
    },
    expenseAmountContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    expenseAmount: {
        fontSize: 16,
        fontWeight: 500,
        textAlign: "right",
    },
    convertedAmount: {
        fontSize: 12,
        color: "#757575",
        textAlign: "right",
    },
    deleteButton: {
        marginLeft: 8,
        padding: 4,
    },
    deleteButtonText: {
        fontSize: 16,
        color: "#ff5252",
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    emptyStateText: {
        fontSize: 16,
        color: "#757575",
        textAlign: "center",
    },
});