import * as _ from 'lodash';
import * as config from "config";
import {DiffGenerator, IDifference} from "./diff_generator_service";

const fs = require('fs');
import {logger, PROD_DB, TEST_DB, dbServices} from "../../globals";
import {isNull, isUndefined} from "util";

export class SQLGenerator {

    serviceName: string;

    generateSQLFillDiffsAndCreateFiles(differences: Array<any>): { SQLCommandsTestToProd: string, SQLCommandsProdToTest: string } {

        let {SQLCommandsTestToProd: testToProd, SQLCommandsProdToTest: prodToTest} = this.generateSQLAndFillDiffs(differences);

        const pathForTestSQL: string = config.get<string>(this.serviceName + '.pathForSQLFiles') + '/SQLCommandsTestDataToProd.sql';
        fs.writeFile(pathForTestSQL, testToProd, function (err) {
            if (err) {
                logger.error(err);
            }
        });

        const pathForProdSQL: string = config.get<string>(this.serviceName + '.pathForSQLFiles') + '/SQLCommandsProdDataToTest.sql';
        fs.writeFile(pathForProdSQL, prodToTest, function (err) {
            if (err) {
                logger.error(err);
            }
        });
        return {SQLCommandsTestToProd: testToProd, SQLCommandsProdToTest: prodToTest};
    }

    generateSQLAndReturnTestToProdFile(differences: Array<any>): {SQLCommandsTestToProd: string, fileName: string} {
        const fileName =  '/SQLCommandsTestDataToProd.txt';
        let {SQLCommandsTestToProd: testToProd, SQLCommandsProdToTest: prodToTest} = this.generateSQLAndFillDiffs(differences);

        return {SQLCommandsTestToProd: testToProd,  fileName};
    }

    generateSQLAndFillDiffs(differences: Array<any>): { SQLCommandsTestToProd: string, SQLCommandsProdToTest: string } {

        let SQLCommandsTestToProd: string = '';
        let SQLCommandsProdToTest: string = '';

        Object.keys(differences).forEach(tableName => {

            differences[tableName].forEach(diffForTable => {

                switch (diffForTable.type) {

                    case DiffGenerator.NO_SUCH_ROW: {

                        let commandTestToProd: string;
                        let commandProdToTest: string;

                        [commandTestToProd, commandProdToTest] = this.generateForNoSuchRow(diffForTable);

                        if (!isNull(commandTestToProd)) {
                            SQLCommandsTestToProd += commandTestToProd;
                            diffForTable.SQLtoFixIt = commandTestToProd;
                        } else {
                            SQLCommandsProdToTest += commandProdToTest;
                            diffForTable.SQLtoFixIt = commandProdToTest;
                        }

                        break;
                    }

                    case DiffGenerator.DIFFERENT_VALUES: {

                        let commandTestToProd: string;
                        let commandProdToTest: string;

                        [commandTestToProd, commandProdToTest] = this.generateForDifferentValues(diffForTable);

                        SQLCommandsTestToProd += commandTestToProd;
                        SQLCommandsProdToTest += commandProdToTest;

                        diffForTable.SQLtoFixIt = `Test ---> prod: ` + commandTestToProd + `\r\n 
                                Prod ---> test: ` + commandProdToTest;
                        break;
                    }
                    default:
                        break;
                }
            });

        });

        return {SQLCommandsTestToProd: SQLCommandsTestToProd, SQLCommandsProdToTest: SQLCommandsProdToTest};
    }

    generateForNoSuchRow(difference: IDifference): [string, string] {

        let schemaName: string;
        let row: any;

        if (!isNull(difference.valueInTest)) {
            schemaName = config.get<string>(dbServices.currentServiceName + '.prod_db.schemaName');
            row = difference.valueInTest;
        } else {
            schemaName = config.get<string>(dbServices.currentServiceName + '.test_db.schemaName');
            row = difference.valueInProd;
        }

        let SQLcommand: string = `INSERT INTO ${schemaName}.${difference.table} (`;

        Object.keys(row).forEach(key => {
            if (!(difference.primaryKeys.indexOf(_.snakeCase(key)) != -1 && (typeof row[key] == 'number'))) {
                SQLcommand += _.snakeCase(key) + `, `;
            }
        });

        //delete last `, `
        SQLcommand = SQLcommand.substr(0, SQLcommand.length - 2);

        SQLcommand += `)\r\n\t VALUES (`;

        Object.keys(row).forEach(key => {

            //if row[key] is not an autoincrement primary key
            if (!(difference.primaryKeys.indexOf(_.snakeCase(key)) != -1 && (typeof row[key] == 'number'))) {

                SQLcommand += this.addValueToSQLString(row[key]);
            }
        });

        //delete last `, `
        SQLcommand = SQLcommand.substr(0, SQLcommand.length - 2);

        SQLcommand += `);\r\n`;

        if (difference.schema == TEST_DB)
            return [null, SQLcommand];

        return [SQLcommand, null];
    }

    generateForDifferentValues(difference: IDifference): [string, string] {

        let schemaName: string = config.get<string>(dbServices.currentServiceName + '.prod_db.schemaName');
        let commandForTestToProd: string = `UPDATE ${schemaName}.${difference.table} SET `;

        schemaName = config.get<string>(dbServices.currentServiceName + '.test_db.schemaName');
        let commandForProdToTest: string = `UPDATE ${schemaName}.${difference.table} SET `;

        //get only getDifferences in values
        let rowTest: any = _.cloneDeep(difference.valueInTest);
        let rowProd: any = _.cloneDeep(difference.valueInProd);

        [rowTest, rowProd] = this.deleteEqualsValuesFromRows(rowTest, rowProd);

        //generate sql to transfer test data to prod
        Object.keys(rowTest).forEach(key => {

            if (!this.columnIsAnAutoincrementPrimaryKey(difference.primaryKeys, key, rowTest[key])) {
                commandForTestToProd += this.addValueAssigntmentToSQLString(key, rowTest[key]);
            }
        });

        //generate sql to transfer prod data to test
        Object.keys(rowProd).forEach(key => {

            //if row[key] is not an autoincrement primary key
            if (!this.columnIsAnAutoincrementPrimaryKey(difference.primaryKeys, key, rowProd[key])) {
                commandForProdToTest += this.addValueAssigntmentToSQLString(key, rowProd[key]);
            }
        });

        //delete last `, `
        commandForTestToProd = commandForTestToProd.substr(0, commandForTestToProd.length - 2);
        commandForProdToTest = commandForProdToTest.substr(0, commandForProdToTest.length - 2);

        //add 'where'
        commandForTestToProd += `\r\n\t WHERE `;
        commandForProdToTest += `\r\n\t WHERE `;

        rowTest = difference.valueInTest;
        rowProd = difference.valueInProd;

        difference.primaryKeys.forEach(key => {

            key = _.camelCase(key);
            let columnName = _.snakeCase(key);

            if (typeof rowTest[key] != 'number') {

                commandForTestToProd += columnName + ` = '` + rowProd[key] + `' AND `;
                commandForProdToTest += columnName + ` = '` + rowTest[key] + `' AND `;
            } else {

                commandForTestToProd += columnName + ` = ` + rowProd[key] + ` AND `;
                commandForProdToTest += columnName + ` = ` + rowTest[key] + ` AND `;
            }
        });

        //delete last ` AND `
        commandForTestToProd = commandForTestToProd.substr(0, commandForTestToProd.length - 4);
        commandForProdToTest = commandForProdToTest.substr(0, commandForProdToTest.length - 4);

        commandForTestToProd += `;\r\n`;
        commandForProdToTest += `;\r\n`;

        return [commandForTestToProd, commandForProdToTest]
    }

    deleteEqualsValuesFromRows(rowTest: any, rowProd: any): [any, any] {
        Object.keys(rowTest).forEach(key => {

            if (Object.keys(rowProd).indexOf(key) == -1) {

                delete rowTest[key];

            } else if (_.isEqual(rowTest[key], rowProd[key])) {

                delete rowTest[key];
                delete rowProd[key];
            }
        });

        Object.keys(rowProd).forEach(key => {
            if (Object.keys(rowTest).indexOf(key) == -1) {
                delete rowProd[key];
            }
        });
        return [_.pickBy(rowTest, v => v !== undefined), _.pickBy(rowProd, v => v !== undefined)];
    }

    addValueToSQLString(value): string {
        if (isNull(value) || isUndefined(value)) {
            return `default, `;
        } else if (typeof value == 'number') {
            return value.toString() + `, `;
        } else if (Array.isArray(value)) {
            return `'{` + value.toString() + `}', `;
        } else if (typeof value == 'object') {
            return `'` + JSON.stringify(value) + `', `;
        }

        return `'` + value.toString() + `', `;
    }

    addValueAssigntmentToSQLString(name: string, value): string {
        if (typeof value == 'number') {
            return _.snakeCase(name) + ` = ` + value.toString() + `, `;
        } else if (Array.isArray(value)) {
            return _.snakeCase(name) + ` = '{` + value.toString() + `}', `;
        } else if (value === null) {
            return _.snakeCase(name) + ` = ` + JSON.stringify(value) + `, `;
        } else if (typeof value == 'object') {
            return _.snakeCase(name) + ` = '` + JSON.stringify(value) + `', `;
        }

        return _.snakeCase(name) + ` = '` + value.toString() + `', `;
    }

    columnIsAnAutoincrementPrimaryKey(primaryKeys: Array<string>, columnName: string, value): boolean {
        return primaryKeys.indexOf(_.snakeCase(columnName)) != -1 && (typeof value == 'number');
    }

}