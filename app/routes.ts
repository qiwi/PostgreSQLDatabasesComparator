import * as Router from 'koa-router';
import * as config from 'config';
import {BaseController} from './controllers/base_controller';
import {logger} from "../globals";

const router = new Router();
const baseController = new BaseController();

/**
 * @api {get} /comparator/getDifferences comparator/changeSchema?schema=*schema_name*
 * @apiName comparator
 * @apiGroup getDifferences
 *
 * @apiDescription Возвращает различия в значениях некоторых таблиц из тестовой и продуктовой базы
 *
 * @apiSuccess {Object} result Объект ответа. Массив различий в значениях с их описанием.
 * @apiError {Any} error Текст/код ошибки сервиса.
 */

router
    .get(config.get('url') + 'getDifferences', baseController.getDifferences);

router
    .get(config.get('url') + 'getTestToProdSQL', baseController.getTestToProdSQLFile);

logger.info(`URL to compare databases from config : ` + config.get('url') + 'getDifferences' + ` Params: dbServiceName (optional) dbServiceName must be described in config file`);
logger.info(`URL to get file with sql commands from prod to test : ` + config.get('url') + 'getTestToProdSQL' +
    ` Params: dbServiceName dbServiceName must be described in config file, disableConstraintsCheck (0 - false, 1 - true) (optional) if true in sql commands will be added lines to disable constraints check and enable after all queries`);

export {router};
