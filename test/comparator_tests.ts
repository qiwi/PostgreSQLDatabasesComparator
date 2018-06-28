import {DiffGenerator, IDifference} from "../app/services/diff_generator_service";

var comparator_service = require("../app/services/comparator_service");
import {Comparator, IComparatorSettings, ITableInfo} from "../app/services/comparator_service";
import * as chai from 'chai';
const assert = chai.assert;

import {TEST_DB} from "../globals";
import {PROD_DB} from "../globals";
import {ITableStructure} from "../app/models/list_tables";

let comparator = new Comparator();
const tableName = "table";
comparator.tableName = tableName;
comparator.diffGenerator.tableName = tableName;

function clearComparator(){
    comparator = new Comparator();

    const tableName = "table";
    comparator.tableName = tableName;
    comparator.diffGenerator.tableName = tableName;

    comparator.uniqueColumnsInTest = [];
    comparator.uniqueColumnsInProd = [];
}

describe('Comparator', function () {

    describe('Comparator.compareTables', function () {

        beforeEach(clearComparator);

        it('should return no diff on equal tables values', function () {

            const tableTestInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: [
                    {column2: 'value4', column: 'value3'},
                    {column: 'value', column2: 'value2'}
                ]
            };

            const tableProdInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: [
                    {column2: 'value2', column: 'value'},
                    {column: 'value3', column2: 'value4'}
                ]
            };

            const comparatorSettings: IComparatorSettings = {
                searchByPrimaries: true,
                ignorePrimaries: false
            };

            chai.expect(comparator.compareTables(tableTestInfo, tableProdInfo, comparatorSettings)).to.eql([]);
        });

        it('should return no diff on equal tables values with settings to search by values', function () {

            const tableTestInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: [
                    {column2: 'value4', column: 'value3'},
                    {column: 'value', column2: 'value2'}
                ]
            };

            const tableProdInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: [
                    {column2: 'value2', column: 'value'},
                    {column: 'value3', column2: 'value4'}
                ]
            };

            const comparatorSettings: IComparatorSettings = {
                searchByPrimaries: false,
                ignorePrimaries: false
            };

            chai.expect(comparator.compareTables(tableTestInfo, tableProdInfo, comparatorSettings)).to.eql([]);
        });

        it('should return no diff on equal tables values with setting to delete primary', function () {

            const tableTestInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: [
                    {column2: 'value4', column: 'value3', column3: 'value5'},
                    {column: 'value', column2: 'value2', column3: 'value3'}
                ]
            };

            const tableProdInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: [
                    {column2: 'value2', column: 'value--', column3: 'value3'},
                    {column: 'value-', column2: 'value4', column3: 'value5'}
                ]
            };

            const comparatorSettings: IComparatorSettings = {
                searchByPrimaries: false,
                ignorePrimaries: true
            };

            chai.expect(comparator.compareTables(tableTestInfo, tableProdInfo, comparatorSettings)).to.eql([]);
        });

        it('should return diff on different tables values', function () {

            const tableTestInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: [
                    {column2: 'value4', column: 'value3'},
                    {column: 'value', column2: 'value2'}
                ]
            };

            const tableProdInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: [
                    {column2: 'value4', column: 'value3'},
                    {column: 'value', column2: 'value4'}
                ]
            };

            const comparatorSettings: IComparatorSettings = {
                searchByPrimaries: true,
                ignorePrimaries: false
            };

            const expectedDiff: IDifference = {
                type: DiffGenerator.DIFFERENT_VALUES,

                primaryKeys: ['column'],
                table: tableName,

                valueInTest: {column: 'value', column2: 'value2'},
                valueInProd: {column: 'value', column2: 'value4'},
            };

            chai.expect(comparator.compareTables(tableTestInfo, tableProdInfo, comparatorSettings)).to.eql([expectedDiff]);
        });

        it('should return diff on different tables values with one empty table', function () {

            const tableTestInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: [
                    {column: 'value', column2: 'value2'}
                ]
            };

            const tableProdInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: []
            };

            const comparatorSettings: IComparatorSettings = {
                searchByPrimaries: true,
                ignorePrimaries: false
            };

            const expectedDiff: IDifference = {
                type: DiffGenerator.NO_SUCH_ROW,

                schema: PROD_DB,
                primaryKeys: ['column'],
                table: tableName,

                valueInTest: {column: 'value', column2: 'value2'},
                valueInProd: null,
            };

            chai.expect(comparator.compareTables(tableTestInfo, tableProdInfo, comparatorSettings)).to.eql([expectedDiff]);
        });

        it('should return no diffs on empty tables', function () {

            const tableTestInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: []
            };

            const tableProdInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: []
            };

            const comparatorSettings: IComparatorSettings = {
                searchByPrimaries: true,
                ignorePrimaries: false
            };

            chai.expect(comparator.compareTables(tableTestInfo, tableProdInfo, comparatorSettings)).to.eql([]);
        });

        it('should return diff on different tables values with settings to search by values', function () {

            const tableTestInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: [],
                tableData: [
                    {column2: 'value4', column: 'value3'},
                    {column: 'value', column2: 'value2'}
                ]
            };

            const tableProdInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: [],
                tableData: [
                    {column2: 'value4', column: 'value3'},
                    {column: 'value2', column2: 'value4'}
                ]
            };

            const comparatorSettings: IComparatorSettings = {
                searchByPrimaries: false,
                ignorePrimaries: false
            };

            const expectedDiff: IDifference[] = [{
                type: DiffGenerator.NO_SUCH_ROW,

                schema: PROD_DB,
                primaryKeys: [],
                table: tableName,

                valueInTest: {column: 'value', column2: 'value2'},
                valueInProd: null,
            }, {
                type: DiffGenerator.NO_SUCH_ROW,

                schema: TEST_DB,
                primaryKeys: [],
                table: tableName,

                valueInTest: null,
                valueInProd: {column: 'value2', column2: 'value4'},
            }];

            chai.expect(comparator.compareTables(tableTestInfo, tableProdInfo, comparatorSettings)).to.eql(expectedDiff);
        });

        it('should return diff on different tables structure (extra columns)', function () {

            const tableTestInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: [
                    {column2: 'value4', column: 'value3'},
                    {column: 'value', column2: 'value2'}
                ]
            };

            const tableProdInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: [
                    {column2: 'value5', column: 'value3', column3: 'value7'},
                    {column: 'value', column2: 'value2', column3: 'value4'}
                ]
            };

            const comparatorSettings: IComparatorSettings = {
                searchByPrimaries: true,
                ignorePrimaries: false
            };

            const expectedDiff: IDifference[] = [{
                type: DiffGenerator.NO_SUCH_COLUMN,

                table: tableName,

                columnsInTest: [],
                columnsInProd: ['column3'],
            }, {
                type: DiffGenerator.DIFFERENT_VALUES,

                primaryKeys: ['column'],
                table: tableName,

                valueInTest: {column2: 'value4', column: 'value3'},
                valueInProd: {column2: 'value5', column: 'value3', column3: 'value7'},
            }];

            chai.expect(comparator.compareTables(tableTestInfo, tableProdInfo, comparatorSettings)).to.eql(expectedDiff);
        });

        it('should return diff on different tables structure and settings to search by values', function () {

            const tableTestInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: [],
                tableData: [
                    {column2: 'value4', column: 'value3'},
                    {column: 'value', column2: 'value2'}
                ]
            };

            const tableProdInfo: ITableInfo = {

                tableName: "table",
                primaryKeys: [],
                tableData: [
                    {column2: 'value5', column: 'value3', column3: 'value7'},
                    {column: 'value', column2: 'value2', column3: 'value4'}
                ]
            };

            const comparatorSettings: IComparatorSettings = {
                searchByPrimaries: false,
                ignorePrimaries: false
            };

            const expectedDiff: IDifference[] = [{
                type: DiffGenerator.NO_SUCH_COLUMN,

                table: tableName,

                columnsInTest: [],
                columnsInProd: ['column3'],
            }, {
                type: DiffGenerator.NO_SUCH_ROW,

                schema: PROD_DB,
                primaryKeys: [],
                table: tableName,

                valueInTest: {column2: 'value4', column: 'value3'},
                valueInProd: null,
            }, {
                type: DiffGenerator.NO_SUCH_ROW,

                schema: TEST_DB,
                primaryKeys: [],
                table: tableName,

                valueInTest: null,
                valueInProd: {column2: 'value5', column: 'value3', column3: 'value7'}
            }];

            chai.expect(comparator.compareTables(tableTestInfo, tableProdInfo, comparatorSettings)).to.eql(expectedDiff);
        });

    });

    describe('Comparator.findWithSamePrimaries', function () {

        beforeEach(clearComparator);

        it('should return row with same primary from second table', function () {
            const rowTest: any = {column: 'value', column2: 'value2'};

            comparator.primaryKeys = ['column'];

            comparator.tableProdInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: [
                    {column: 'value2', column2: 'value'},
                    {column: 'value', column2: 'value3'}
                ]
            };

            chai.expect(comparator.findWithSamePrimaries(rowTest)).to.eql({column: 'value', column2: 'value3'});
        });

        it('should return row with same primaries from second table', function () {
            const rowTest: any = {column: 'value', column2: 'value2', column3: 'value7'};

            comparator.primaryKeys = ['column', 'column_2'];

            comparator.tableProdInfo = {

                tableName: "table",
                primaryKeys: ['column', 'column_2'],
                tableData: [
                    {column: 'value7', column2: 'value', column3: 'value2'},
                    {column: 'value', column2: 'value2', column3: 'value4'}
                ]
            };

            chai.expect(comparator.findWithSamePrimaries(rowTest)).to.eql({column: 'value', column2: 'value2', column3: 'value4'});
        });

        it('should return null because there is no row with same primary in second table', function () {
            const rowTest: any = {column: 'value', column2: 'value2'};

            comparator.primaryKeys = ['column'];

            comparator.tableProdInfo = {

                tableName: "table",
                primaryKeys: ['column'],
                tableData: [
                    {column: 'value2', column2: 'value3'},
                    {column: 'value3', column2: 'value2'}
                ]
            };

            chai.expect(comparator.findWithSamePrimaries(rowTest)).to.eql(null);
        });

        it('should return null because there is no row with same primaries in second table', function () {
            const rowTest: any = {column: 'value', column2: 'value3', column3: 'value7'};

            comparator.primaryKeys = ['column', 'column_2'];

            comparator.tableProdInfo = {

                tableName: "table",
                primaryKeys: ['column', 'column2'],
                tableData: [
                    {column: 'value7', column2: 'value', column3: 'value2'},
                    {column: 'value', column2: 'value2', column3: 'value4'}
                ]
            };

            chai.expect(comparator.findWithSamePrimaries(rowTest)).to.eql(null);
        });
    });

    describe('Comparator.findWithSameValues', function () {

        beforeEach(clearComparator);

        it('should return row with same values from second table', function () {
            const rowTest: any = {column: 'value', column2: 'value2'};

            comparator.tableProdInfo = {

                tableName: "table",
                primaryKeys: [],
                tableData: [
                    {column: 'value2', column2: 'value'},
                    {column: 'value', column2: 'value2'}
                ]
            };

            chai.expect(comparator.findWithSameValues(rowTest)).to.eql({column: 'value', column2: 'value2'});
        });

        it('should return null because there is no row with same values in second table', function () {
            const rowTest: any = {column: 'value', column2: 'value2'};

            comparator.tableProdInfo = {

                tableName: "table",
                primaryKeys: [],
                tableData: [
                    {column: 'value2', column2: 'value'},
                    {column: 'value', column2: 'value3'}
                ]
            };

            chai.expect(comparator.findWithSameValues(rowTest)).to.eql(null);
        });
    });

    describe('Comparator.compareRows', function () {

        beforeEach(clearComparator);

        it('should create diff about not found column', function (){
            const rowTest: any = {column: 'value', column2: 'value2'};
            const rowProd: any = {column: 'value'};

            let expectedDiff: IDifference = {
                type: DiffGenerator.NO_SUCH_COLUMN,

                table: tableName,

                columnsInTest: ['column2'],
                columnsInProd: []
            };

            comparator.checkTablesStructure(rowTest, rowProd);

            chai.expect(comparator.myDifferences).to.eql([expectedDiff]);
            comparator.myDifferences = [];
        });

        it('should create diff about not equals values', function (){
            const rowTest: any = {column: 'value'};
            const rowProd: any = {column: 'value1'};

            const expectedDiff: IDifference = {
                type: DiffGenerator.DIFFERENT_VALUES,

                primaryKeys: undefined,
                table: tableName,

                valueInTest: rowTest,
                valueInProd: rowProd,
            };

            comparator.compareRows(rowTest, rowProd);

            chai.expect(comparator.myDifferences).to.eql([expectedDiff]);
            comparator.myDifferences = [];
        });

        it('should create diff about not equals values', function (){
            const rowTest: any = {column: 'value', column2: 'value'};
            const rowProd: any = {column: 'value', column2: 'value2'};

            const expectedDiff: IDifference = {
                type: DiffGenerator.DIFFERENT_VALUES,

                primaryKeys: undefined,
                table: tableName,

                valueInTest: rowTest,
                valueInProd: rowProd,
            };

            comparator.compareRows(rowTest, rowProd);

            chai.expect(comparator.myDifferences).to.eql([expectedDiff]);
            comparator.myDifferences = [];
        });

        it('should create diff about not found column and different values', function (){
            const rowTest: any = {column: 'value', column2: 'value2'};
            const rowProd: any = {column: 'value3'};

            const expectedDiffs: IDifference[] = [{
                type: DiffGenerator.NO_SUCH_COLUMN,

                table: tableName,

                columnsInTest: ['column2'],
                columnsInProd: []
            }, {
                type: DiffGenerator.DIFFERENT_VALUES,

                primaryKeys: undefined,
                table: tableName,

                valueInTest: rowTest,
                valueInProd: rowProd,
            }];

            comparator.checkTablesStructure(rowTest, rowProd);
            comparator.compareRows(rowTest, rowProd);

            chai.expect(comparator.myDifferences).to.eql(expectedDiffs);
            comparator.myDifferences = [];
        });

        it('should create diff about not found columns and different values', function (){
            const rowTest: any = {column: 'value', column2: 'value2', column3: 'value3'};
            const rowProd: any = {column: 'value3'};

            const expectedDiffs: IDifference[] = [{
                type: DiffGenerator.NO_SUCH_COLUMN,

                table: tableName,

                columnsInTest: ['column2', 'column3'],
                columnsInProd: []
            }, {
                type: DiffGenerator.DIFFERENT_VALUES,

                primaryKeys: undefined,
                table: tableName,

                valueInTest: rowTest,
                valueInProd: rowProd,
            }];

            comparator.checkTablesStructure(rowTest, rowProd);
            comparator.compareRows(rowTest, rowProd);

            chai.expect(comparator.myDifferences).to.eql(expectedDiffs);
            comparator.myDifferences = [];
        });

    });


    describe('Comparator.samePrimaryKeysValues', function () {

        beforeEach(clearComparator);

        it('should return true on equals maps of primary columns', function () {
            const keys1 = new Map();
            keys1.set('primaryKey1', 'primary1');
            keys1.set('primaryKey2', 'primary2');

            const keys2 = new Map();
            keys2.set('primaryKey1', 'primary1');
            keys2.set('primaryKey2', 'primary2');

            let result = comparator.samePrimaryKeysValues(keys1, keys2);

            assert.isTrue(result);
        });

        it('should return true on different orders of keys in maps', function () {
            const keys1 = new Map();
            keys1.set('primaryKey1', 'primary1');
            keys1.set('primaryKey2', 'primary2');

            const keys2 = new Map();
            keys2.set('primaryKey2', 'primary2');
            keys2.set('primaryKey1', 'primary1');

            let result = comparator.samePrimaryKeysValues(keys1, keys2);

            assert.isTrue(result);
        });

        it('should return true on empty maps of primary columns', function () {
            const keys1 = new Map();
            const keys2 = new Map();
            let result = comparator.samePrimaryKeysValues(keys1, keys2);

            assert.isTrue(result);
        });

        it('should return false on partly different maps of primary columns', function () {
            const keys1 = new Map();
            keys1.set('primaryKey1', 'primary1');
            keys1.set('primaryKey2', 'primary2');

            const keys2 = new Map();
            keys2.set('primaryKey1', 'primary1');
            keys2.set('primaryKey2', 'primary4');

            let result = comparator.samePrimaryKeysValues(keys1, keys2);

            assert.isFalse(result);
        });

        it('should return false on different maps of primary columns', function () {
            const keys1 = new Map();
            keys1.set('primaryKey1', 'primary1');
            keys1.set('primaryKey2', 'primary2');

            const keys2 = new Map();
            keys2.set('primaryKey1', 'primary4');
            keys2.set('primaryKey2', 'primary5');

            let result = comparator.samePrimaryKeysValues(keys1, keys2);

            assert.isFalse(result);
        });


        it('should return true on partly different keys in maps but equal values', function () {
            const keys1 = new Map();
            keys1.set('primaryKey1', 'primary1');
            keys1.set('primaryKey2', 'primary2');

            const keys2 = new Map();
            keys2.set('primaryKey1', 'primary1');
            keys2.set('primaryKey3', 'primary2');

            let result = comparator.samePrimaryKeysValues(keys1, keys2);

            assert.isFalse(result);
        });

        it('should return false on different keys in maps but equal values', function () {
            const keys1 = new Map();
            keys1.set('primaryKey1', 'primary1');
            keys1.set('primaryKey2', 'primary2');

            const keys2 = new Map();
            keys2.set('primaryKey4', 'primary1');
            keys2.set('primaryKey3', 'primary2');

            let result = comparator.samePrimaryKeysValues(keys1,
                keys2);

            assert.isFalse(result);
        });
    });

    describe('Comparator.isPrimaryColumn', function () {

        beforeEach(clearComparator);

        it('should return true on string that is in array with length = 1', function (){
            comparator.primaryKeys = ['key_1'];

            assert.isTrue(comparator.isPrimaryColumn('key1'));
        });


        it('should return true on one string that is in array with length > 1', function (){
            comparator.primaryKeys = ['key_2', 'key_1'];

            assert.isTrue(comparator.isPrimaryColumn('key1'));
        });


        it('should return false on empty array of primaries', function (){
            comparator.primaryKeys = [];

            assert.isFalse(comparator.isPrimaryColumn('key1'));
        });

        it('should return false on empty array of primaries and empty string', function (){
            comparator.primaryKeys = [];

            assert.isFalse(comparator.isPrimaryColumn(''));
        });
    });

    describe('Comparator.compareListOfTablesNamesAndMakeDiffs', function () {

        beforeEach(clearComparator);

        it('should return empty diffs array on equal values and order in arrays', function (){
            comparator.primaryKeys = ['key1'];

            const testTables: Array<ITableStructure> = [
                {
                    primaryColumns: [],
                    tableName: 'table1'
                },
                {
                    primaryColumns: [],
                    tableName: 'table2'
                },
                {
                    primaryColumns: [],
                    tableName: 'table3'
                }
            ];
            const prodTables: Array<ITableStructure> = [
                {
                    primaryColumns: [],
                    tableName: 'table1'
                },
                {
                    primaryColumns: [],
                    tableName: 'table2'
                },
                {
                    primaryColumns: [],
                    tableName: 'table3'
                }
            ];

            let {tablesToCompare: finalListOfTables, tableDifferences: getDifferences} = comparator.compareListOfTablesNamesAndMakeDiffs(testTables, prodTables);

            chai.expect([finalListOfTables, getDifferences]).to.eql([testTables,[]]);
        });

        it('should return empty diffs array on equal values in arrays but different order', function (){
            comparator.primaryKeys = ['key1'];

            const testTables: Array<ITableStructure> = [
                {
                    primaryColumns: [],
                    tableName: 'table1'
                },
                {
                    primaryColumns: [],
                    tableName: 'table3'
                },
                {
                    primaryColumns: [],
                    tableName: 'table2'
                }
            ];
            const prodTables: Array<ITableStructure> = [
                {
                    primaryColumns: [],
                    tableName: 'table2'
                },
                {
                    primaryColumns: [],
                    tableName: 'table1'
                },
                {
                    primaryColumns: [],
                    tableName: 'table3'
                }
            ];

            let {tablesToCompare: finalListOfTables, tableDifferences: getDifferences} = comparator.compareListOfTablesNamesAndMakeDiffs(testTables, prodTables);

            chai.expect([finalListOfTables, getDifferences]).to.eql([testTables,[]]);
        });

        it('should return edited list of tables and one diff on different values in arrays', function (){
            comparator.primaryKeys = ['key1'];

            const testTables: Array<ITableStructure> = [
                {
                    primaryColumns: [],
                    tableName: 'table1'
                },
                {
                    primaryColumns: [],
                    tableName: 'table3'
                },
                {
                    primaryColumns: [],
                    tableName: 'table2'
                }
            ];

            const prodTables: Array<ITableStructure>  = [
                {
                    primaryColumns: [],
                    tableName: 'table2'
                },
                {
                    primaryColumns: [],
                    tableName: 'table1'
                }
            ];

            const expectedDiff: IDifference = {
                type: DiffGenerator.NO_SUCH_TABLE,

                schema: PROD_DB,
                table: 'table3'
            };

            const expectedTables: Array<ITableStructure> = [
                {
                    primaryColumns: [],
                    tableName: 'table1'
                },
                {
                    primaryColumns: [],
                    tableName: 'table2'
                }
            ];

            let {tablesToCompare: finalListOfTables, tableDifferences: getDifferences} = comparator.compareListOfTablesNamesAndMakeDiffs(testTables, prodTables);

            chai.expect([finalListOfTables, getDifferences]).to.eql([expectedTables,[expectedDiff]]);
        });

        it('should return edited list of tables and diffs on different values in arrays', function (){
            comparator.primaryKeys = ['key1'];

            const testTables: Array<ITableStructure> = [
                {
                    primaryColumns: [],
                    tableName: 'table1'
                },
                {
                    primaryColumns: [],
                    tableName: 'table3'
                },
                {
                    primaryColumns: [],
                    tableName: 'table2'
                }
            ];

            const prodTables: Array<ITableStructure>  = [
                {
                    primaryColumns: [],
                    tableName: 'table2'
                },
                {
                    primaryColumns: [],
                    tableName: 'table1'
                },
                {
                    primaryColumns: [],
                    tableName: 'table4'
                }
            ];

            const expectedDiff: IDifference[] = [{
                type: DiffGenerator.NO_SUCH_TABLE,

                schema: PROD_DB,
                table: 'table3'
            }, {
                type: DiffGenerator.NO_SUCH_TABLE,

                schema: TEST_DB,
                table: 'table4'
            }];
            const expectedTables: Array<ITableStructure> = [
                {
                    primaryColumns: [],
                    tableName: 'table1'
                },
                {
                    primaryColumns: [],
                    tableName: 'table2'
                }
            ];

            let {tablesToCompare: finalListOfTables, tableDifferences: getDifferences} = comparator.compareListOfTablesNamesAndMakeDiffs(testTables, prodTables);

            chai.expect([finalListOfTables, getDifferences]).to.eql([expectedTables, expectedDiff]);
        });
    });
});