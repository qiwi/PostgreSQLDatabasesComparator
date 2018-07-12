import * as config from "config";
import * as _ from 'lodash';
import { Controller, PgService, PgPool} from "innots";
import { Context } from 'koa';
import { TableDataModel } from "../models/table_data";
import { Comparator, IComparatorSettings, ITableInfo } from "../services/comparator_service";
import { ITableStructure, TablesWithPrimariesListModel } from "../models/list_tables";
import { SQLGenerator } from "../services/sql_generator_service";
import * as globals from "../../globals";
import { PROD_DB, TEST_DB } from "../../globals";
import { DiffGenerator, IDifference } from "../services/diff_generator_service";

const PassThrough = require('stream').PassThrough;
const dbServices = globals.dbServices;
const path = require('path');
const extname = path.extname;

export class BaseController extends Controller {

    comparator = new Comparator();
    SQLGenerator = new SQLGenerator();

    getDifferences = async (ctx: Context, next: () => any): Promise<void> => {

        const data = this.validate(ctx, (validator) => {
            return {
                serviceName: validator.optional.isString('dbServiceName', 0, 30)
            }
        });
        this.setNewServiceName(data.serviceName);

        let differences = await this.generateDiffs();

        let {SQLCommandsTestToProd: testToProd, SQLCommandsProdToTest: prodToTest} =
            this.SQLGenerator.generateSQLFillDiffsAndCreateFiles(differences["ContentDifferences"]);

        if (differences["DDLDifferences"].length === 0)
            differences["DDLDifferences"] = `There are no differences in DDL`;

        differences["SQLTestToProd"] = testToProd;
        differences["SQLProdToTest"] = prodToTest;

        ctx.body = differences;
        next();
    };

    getTestToProdSQLFile = async (ctx: Context): Promise<void> => {

        const data = this.validate(ctx, (validator) => {
            return {
                serviceName: validator.optional.isString('dbServiceName', 0, 30),
                disableConstraintsCheck: validator.optional.isInt('disableConstraintsCheck', 0, 1)
            }
        });
        this.setNewServiceName(data.serviceName);

        let differences = await this.generateDiffs();

        let {SQLCommandsTestToProd: SQLCommandsTestToProd, fileName: fileName} =
            this.SQLGenerator.generateSQLAndReturnTestToProdFile(differences["ContentDifferences"]);

        if (data.disableConstraintsCheck) {
            SQLCommandsTestToProd = `SET session_replication_role = replica;${SQLCommandsTestToProd}SET session_replication_role = DEFAULT;`;
        }

        ctx.response.set('Content-Type', 'text/plain');
        ctx.response.set('Content-Disposition', `attachment; filename="${fileName}"`);
        ctx.response.body = SQLCommandsTestToProd;
    };

    async generateDiffs(): Promise<any> {
        let differences = {};
        let {tablesToCompare: tablesToCompare, tablesDifferences: tablesDiffs} = await this.getTablesToCompare();

        differences["DDLDifferences"] = tablesDiffs;

        differences["ContentDifferences"] = {};

        for (let tableAndPrimaries of tablesToCompare) {

            const diffsToAdd = await this.getTwoTablesInfoAndCompare(tableAndPrimaries);

            if (diffsToAdd.length > 0)
                differences["ContentDifferences"][tableAndPrimaries.tableName] = diffsToAdd;

            const ddlDiffs = diffsToAdd.filter(diffToAdd => {
                return [DiffGenerator.NO_SUCH_TABLE, DiffGenerator.NO_SUCH_COLUMN].includes(diffToAdd.type);
            });

            differences["DDLDifferences"] = differences["DDLDifferences"].concat(ddlDiffs);
        }
        return differences;
    }


    async getTablesToCompare(): Promise<{ tablesToCompare: Array<ITableStructure>, tablesDifferences: Array<IDifference> }> {
        let tablesToCompare: Array<string> =
            config.get<Array<string>>(dbServices.currentServiceName + '.comparator_settings.tablesToCompare');

        const tablesToCompareTest: any =
            await TablesWithPrimariesListModel.getTables(dbServices.currentServiceName, TEST_DB, tablesToCompare);
        const tablesToCompareProd: any =
            await TablesWithPrimariesListModel.getTables(dbServices.currentServiceName, PROD_DB, tablesToCompare);

        //check if tablesToCompare for test and prod have same tables, if no --> make getDifferences for tables
        let {tablesToCompare: newTablesToCompare, tableDifferences: tablesDiffs} =
            this.comparator.compareListOfTablesNamesAndMakeDiffs(tablesToCompareTest, tablesToCompareProd);

        return {tablesToCompare: newTablesToCompare, tablesDifferences: tablesDiffs};
    }

    async getTwoTablesInfoAndCompare(tableAndPrimaries: ITableStructure): Promise<Array<IDifference>> {
        const testTable: ITableInfo = await TableDataModel.getData(tableAndPrimaries.tableName, TEST_DB);
        const prodTable: ITableInfo = await TableDataModel.getData(tableAndPrimaries.tableName, PROD_DB);

        testTable.primaryKeys = tableAndPrimaries.primaryColumns;
        prodTable.primaryKeys = tableAndPrimaries.primaryColumns;

        const tableDifferences = _.cloneDeep(
            this.comparator.compareTables(testTable, prodTable,
                this.getComparatorSettingsForTable(tableAndPrimaries.tableName))
        );

        return tableDifferences;
    }

    getComparatorSettingsForTable(tableName: string): IComparatorSettings {

        const defaultSettings: IComparatorSettings = {
            searchByPrimaries: true,
            ignorePrimaries: false
        };

        const tablesWithOverriddenSettings: Array<any> =
            config.get<Array<any>>(dbServices.currentServiceName + '.comparator_settings.overrideDefaultSettings');

        for (let table of tablesWithOverriddenSettings) {
            if (table.tableName == tableName) {
                return table.settings;
            }
        }

        return defaultSettings;
    }

    setNewServiceName(serviceName: string) {
        if (!config.has(serviceName)) {
            serviceName = config.get<string>('defaultServiceName');
        }

        dbServices.currentServiceName = serviceName;
        this.SQLGenerator.serviceName = serviceName;

        const dbConfig: any = config.get<any>(serviceName);

        dbServices.test_pool = new PgPool(dbConfig.test_db);
        dbServices.prod_pool = new PgPool(dbConfig.prod_db);

        dbServices.testPgService = new PgService(dbServices.test_pool);
        dbServices.prodPgService = new PgService(dbServices.prod_pool);
    }
}
